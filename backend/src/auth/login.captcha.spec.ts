import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { jest } from '@jest/globals';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetService } from './password-reset.service';
import { RecaptchaService } from './recaptcha.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Login CAPTCHA HTTP contract', () => {
  let app: INestApplication;
  const authenticate = jest.fn(async (_email: string, _password: string, _remember: boolean) => ({
    token: 'existing-session-token',
    user: { id: 1, name: 'Member', role: 'PENGUNJUNG' },
  }));
  const google = jest.spyOn(globalThis, 'fetch');
  const settings: Record<string, string> = {
    NODE_ENV: 'production', RECAPTCHA_SECRET_KEY: 'test-private-key',
    FRONTEND_URL: 'https://perpus.example.com',
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-session-secret' })],
      controllers: [AuthController],
      providers: [
        RecaptchaService,
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: (key: string) => settings[key] } },
        { provide: AuthService, useValue: { login: authenticate } },
        { provide: PasswordResetService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication(); await app.init();
  });
  beforeEach(() => { authenticate.mockClear(); google.mockReset(); });
  afterAll(async () => { google.mockRestore(); await app.close(); });
  const credentials = { email: 'member@example.com', password: 'existing-password', remember: true };

  it('rejects direct login without a token before checking credentials or setting cookies', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send(credentials).expect(400);
    expect(response.body.code).toBe('CAPTCHA_REQUIRED');
    expect(response.headers['set-cookie']).toBeUndefined();
    expect(authenticate).not.toHaveBeenCalled(); expect(google).not.toHaveBeenCalled();
  });

  it('rejects a failed challenge before authentication', async () => {
    google.mockResolvedValueOnce(new Response(JSON.stringify({ success: false })));
    const response = await request(app.getHttpServer()).post('/auth/login').send({ ...credentials, captchaToken: 'bad-token' }).expect(400);
    expect(response.body.code).toBe('CAPTCHA_INVALID');
    expect(response.headers['set-cookie']).toBeUndefined(); expect(authenticate).not.toHaveBeenCalled();
  });

  it('verifies first, then preserves existing credentials, remember-me and session response', async () => {
    google.mockImplementationOnce(async () => {
      expect(authenticate).not.toHaveBeenCalled();
      return new Response(JSON.stringify({ success: true, hostname: 'perpus.example.com' }));
    });
    const response = await request(app.getHttpServer()).post('/auth/login').send({ ...credentials, captchaToken: 'valid-token' }).expect(201);
    expect(authenticate).toHaveBeenCalledWith(credentials.email, credentials.password, true);
    expect(response.body.user.role).toBe('PENGUNJUNG');
    expect(response.headers['set-cookie'][0]).toContain('perpus_session=existing-session-token');
    expect(response.headers['set-cookie'][0]).toContain('Max-Age=2592000');
    expect(response.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(response.body.token).toBeUndefined();
  });
});
