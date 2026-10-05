import { PasswordResetService } from './password-reset.service';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { EmailVerificationService } from './email-verification.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Email verification HTTP flow', () => {
  let app: INestApplication;
  let jwt: JwtService;
  const secret = 'email-verification-test-secret-with-sufficient-entropy';
  let user: {
    id: number;
    name: string;
    email: string;
    passwordHash: string;
    role: string;
    emailVerified: boolean;
  };
  const mail = {
    isConfigured: () => true,
    sendVerificationEmail: jest.fn(
      async (_email: string, _link: string) => true,
    ),
  };
  const settings: Record<string, string> = {
    EMAIL_VERIFICATION_SECRET: secret,
    EMAIL_VERIFICATION_URL: 'http://localhost:3001/auth/verify-email',
  };
  const prisma = {
    user: {
      findUnique: jest.fn(
        async ({ where }: { where: { id?: number; email?: string } }) =>
          where.id === user.id || where.email === user.email ? user : null,
      ),
      create: jest.fn(async ({ data }: { data: Partial<typeof user> }) => {
        user = { ...user, ...data };
        return user;
      }),
      updateMany: jest.fn(async () => {
        user.emailVerified = true;
        return { count: 1 };
      }),
    },
    memberProfile: { create: jest.fn(async () => ({})) },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma),
    ),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'session-test-secret' })],
      controllers: [AuthController],
      providers: [
        { provide: PasswordResetService, useValue: {} },
        AuthService,
        EmailVerificationService,
        JwtAuthGuard,
        { provide: MailService, useValue: mail },
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => settings[key],
            getOrThrow: () => 'session-test-secret',
          },
        },
      ],
    }).compile();
    jwt = module.get(JwtService);
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    settings.EMAIL_VERIFICATION_SECRET = secret;
    user = {
      id: 1,
      name: 'Test Member',
      email: 'member@example.com',
      passwordHash: await bcrypt.hash('passwordaman', 4),
      role: 'PENGUNJUNG',
      emailVerified: false,
    };
  });
  afterAll(async () => {
    await app.close();
  });
  const token = (expiresIn: number = 3600, purpose = 'email-verification') =>
    jwt.signAsync(
      { sub: 1, email: 'member@example.com', purpose },
      {
        secret,
        expiresIn,
        audience: 'perpus-email-verification',
        issuer: 'perpus-api',
      },
    );

  it('sends a verification link after registration and leaves the account pending', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Test Member',
        email: 'new@example.com',
        whatsapp: '08123456789',
        address: 'Pekanbaru',
        identity: '001234',
        password: 'passwordaman',
        memberType: 'umum',
      })
      .expect(201);
    expect(response.body.data.emailVerified).toBe(false);
    expect(response.body.verificationEmailSent).toBe(true);
    expect(response.headers['set-cookie']).toBeUndefined();
    const link = new URL(mail.sendVerificationEmail.mock.calls[0][1]);
    expect(link.pathname).toBe('/auth/verify-email');
    expect(link.searchParams.get('token')).toBeTruthy();
    expect(response.body.token).toBeUndefined();
  });
  it('accepts valid tokens and repeated verification safely', async () => {
    const value = await token();
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: value })
      .expect(200);
    expect(user.emailVerified).toBe(true);
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: value })
      .expect(200);
    expect(prisma.user.updateMany).toHaveBeenCalledTimes(1);
  });
  it('rejects invalid, expired, wrong-purpose, and session tokens', async () => {
    for (const value of [
      'invalid',
      await token(-1),
      await token(3600, 'session'),
      await jwt.signAsync({ sub: 1, email: user.email, role: 'ADMIN' }),
    ]) {
      await request(app.getHttpServer())
        .get('/auth/verify-email')
        .query({ token: value })
        .expect(400);
    }
    expect(user.emailVerified).toBe(false);
  });
  it('rejects absent token, wrong account email, and deleted user', async () => {
    await request(app.getHttpServer()).get('/auth/verify-email').expect(400);
    const value = await token();
    user.email = 'changed@example.com';
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: value })
      .expect(400);
    user.id = 2;
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: value })
      .expect(400);
  });
  it('resends for pending users without creating accounts or returning a token', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ email: ' MEMBER@EXAMPLE.COM ' })
      .expect(200);
    expect(mail.sendVerificationEmail).toHaveBeenCalledWith(
      user.email,
      expect.any(String),
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
    expect(response.body.token).toBeUndefined();
    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ email: user.email })
      .expect(429);
  });
  it('does not resend for verified users and validates email input', async () => {
    user.emailVerified = true;
    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ email: user.email })
      .expect(200);
    expect(mail.sendVerificationEmail).not.toHaveBeenCalled();
    for (const email of ['', 'bad@', 123])
      await request(app.getHttpServer())
        .post('/auth/resend-verification')
        .send({ email })
        .expect(400);
  });
  it('does not claim successful delivery when mail is unavailable', async () => {
    user.email = 'unavailable@example.com';
    mail.sendVerificationEmail.mockResolvedValueOnce(false);
    await request(app.getHttpServer())
      .post('/auth/resend-verification')
      .send({ email: user.email })
      .expect(503);
  });
  it('missing verification secret rejects token processing safely', async () => {
    delete settings.EMAIL_VERIFICATION_SECRET;
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: await token() })
      .expect(503);
  });
  it('pending login is rejected, then verified member and admin login work', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'passwordaman' })
      .expect(403);
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token: await token() })
      .expect(200);
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'passwordaman' })
      .expect(201);
    user.role = 'ADMIN';
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: user.email, password: 'passwordaman' })
      .expect(201);
  });
});
