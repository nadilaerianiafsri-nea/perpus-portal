import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { jest } from '@jest/globals';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

describe('Registration HTTP contract', () => {
  let app: INestApplication;
  const users: Record<string, unknown>[] = [];
  const prisma = {
    user: {
      findUnique: jest.fn(
        ({ where }: { where: { email: string } }) =>
          users.find((user) => user.email === where.email) ?? null,
      ),
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        const user = { id: users.length + 1, ...data };
        users.push(user);
        return user;
      }),
    },
    $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback(prisma),
    ),
    memberProfile: { create: jest.fn(async () => ({})) },
  };
  const valid = {
    name: 'Budi Santoso',
    email: 'budi@example.com',
    whatsapp: '08123456789',
    address: 'Pekanbaru',
    identity: '001234',
    password: 'passwordaman',
    memberType: 'umum',
    consent: true,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: 'registration-test-only-secret' }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtAuthGuard,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: { getOrThrow: () => 'registration-test-only-secret' },
        },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  beforeEach(() => {
    users.length = 0;
    jest.clearAllMocks();
  });
  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['umum', {}],
    ['mahasiswa', { university: 'Universitas Riau' }],
    ['pegawai', { division: 'Pelayanan' }],
  ])(
    'creates pending %s members without a session or password in response',
    async (memberType, additional) => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...valid, memberType, ...additional })
        .expect(201);
      expect(response.headers['set-cookie']).toBeUndefined();
      expect(response.body.data).toMatchObject({
        email: valid.email,
        emailVerified: false,
      });
      expect(response.body.token).toBeUndefined();
      expect(JSON.stringify(response.body)).not.toContain('password');
      expect(users[0].role).toBe('PENGUNJUNG');
      expect(
        await bcrypt.compare(valid.password, users[0].passwordHash as string),
      ).toBe(true);
      expect(users[0].emailVerified).toBe(false);
    },
  );
  it('normalizes email and rejects duplicates', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...valid, email: ' BUDI@EXAMPLE.COM ' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(valid)
      .expect(409);
    expect(users).toHaveLength(1);
  });
  it.each([
    { password: 'short' },
    { memberType: 'mahasiswa' },
    { memberType: 'pegawai' },
    { memberType: 'ADMIN' },
    { memberType: 'toString' },
    { whatsapp: '  ' },
    { name: 123 },
    { identity: 123 },
    { email: 'bad@' },
    { consent: false },
    { confirmPassword: 'different' },
    { role: 'ADMIN' },
    { emailVerified: true },
  ])('rejects invalid or privilege-changing input %j', async (change) => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...valid, ...change })
      .expect(400);
    expect(users).toHaveLength(0);
  });
  it('converts a concurrent unique constraint failure to Conflict', async () => {
    prisma.user.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('Unique constraint', {
        code: 'P2002',
        clientVersion: '7.10.0',
      }),
    );
    await request(app.getHttpServer())
      .post('/auth/register')
      .send(valid)
      .expect(409);
  });
  it('blocks login for pending members without changing verified/admin login', async () => {
    const passwordHash = await bcrypt.hash(valid.password, 4);
    users.push({
      id: 1,
      name: valid.name,
      email: valid.email,
      passwordHash,
      role: 'PENGUNJUNG',
      emailVerified: false,
    });
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: valid.email, password: valid.password })
      .expect(403);
    users[0].emailVerified = true;
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: valid.email, password: valid.password })
      .expect(201);
    users[0].role = 'ADMIN';
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: valid.email, password: valid.password })
      .expect(201);
  });
});
