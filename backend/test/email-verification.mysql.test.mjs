import cookieParser from 'cookie-parser';
import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { AppModule } from '../dist/app.module.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';

const databaseUrl = process.env.EMAIL_VERIFICATION_TEST_DATABASE_URL;
if (
  !databaseUrl ||
  !['/perpus_db', '/perpus_registration_test'].includes(
    new URL(databaseUrl).pathname,
  )
) {
  throw new Error(
    'Set EMAIL_VERIFICATION_TEST_DATABASE_URL explicitly for the registration verification database.',
  );
}
const marker = randomUUID();
const password = randomUUID();
const secret = randomUUID() + randomUUID();
const ids = [];
const messages = [];
const sockets = new Set();
let app, prisma, jwt;
const smtp = createServer((socket) => {
  sockets.add(socket);
  socket.on('close', () => sockets.delete(socket));
  socket.on('error', () => {});
  socket.write('220 localhost registration test SMTP\r\n');
  let buffer = '',
    data = false,
    message = '';
  socket.on('data', (chunk) => {
    buffer += chunk.toString();
    let position;
    while ((position = buffer.indexOf('\r\n')) !== -1) {
      const line = buffer.slice(0, position);
      buffer = buffer.slice(position + 2);
      if (data) {
        if (line === '.') {
          messages.push(message);
          message = '';
          data = false;
          socket.write('250 Message accepted locally\r\n');
        } else message += line.replace(/^\.\./, '.') + '\r\n';
      } else if (/^(EHLO|HELO)/i.test(line))
        socket.write('250-localhost\r\n250 SIZE 1048576\r\n');
      else if (/^DATA$/i.test(line)) {
        data = true;
        socket.write('354 End data with a dot\r\n');
      } else if (/^QUIT$/i.test(line)) socket.end('221 Goodbye\r\n');
      else socket.write('250 OK\r\n');
    }
  });
});
const settings = {
  DATABASE_URL: databaseUrl,
  JWT_SECRET: randomUUID() + randomUUID(),
  EMAIL_VERIFICATION_SECRET: secret,
  EMAIL_VERIFICATION_URL: 'http://localhost:3001/auth/verify-email',
  PASSWORD_RESET_SECRET: randomUUID() + randomUUID(),
  PASSWORD_RESET_URL: 'http://localhost:3000/reset-password',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '',
  SMTP_SECURE: 'false',
  MAIL_FROM: 'library@example.com',
};
function receivedToken() {
  const decoded = messages
    .at(-1)
    .replace(/=\r?\n/g, '')
    .replace(/=([a-f\d]{2})/gi, (_, hex) =>
      String.fromCharCode(parseInt(hex, 16)),
    );
  const token = decoded.match(/token=([A-Za-z0-9_.-]+)/)?.[1];
  assert.ok(token, 'SMTP capture must contain the verification token');
  return token;
}
before(async () => {
  await new Promise((resolve) => smtp.listen(0, '127.0.0.1', resolve));
  settings.SMTP_PORT = String(smtp.address().port);
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue({
      get: (key) => settings[key],
      getOrThrow: (key) => {
        if (!settings[key]) throw new Error('Missing test configuration');
        return settings[key];
      },
    })
    .compile();
  app = module.createNestApplication({ logger: false });
  app.use(cookieParser());
  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);
  await app.init();
  if (process.env.AUTH_FRONTEND_SMOKE === '1') await app.listen(3001, '127.0.0.1');
});
await test('registration delivers to local SMTP; pending user cannot login', async () => {
  const email = `verification-${marker}@example.com`;
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      name: 'Email Verification Test',
      email,
      whatsapp: '081234567890',
      address: 'Pekanbaru',
      identity: '00123456789',
      password,
      memberType: 'umum',
    })
    .expect(201);
  ids.push(response.body.data.id);
  assert.equal(response.body.data.emailVerified, false);
  assert.equal(response.body.verificationEmailSent, true);
  assert.equal(response.headers['set-cookie'], undefined);
  assert.equal(messages.length, 1);
  assert.ok(!messages[0].includes(password));
  const saved = await prisma.user.findUnique({ where: { email } });
  assert.equal(saved.emailVerified, false);
  await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(403);
});
await test('resend delivers a different signed token and enforces cooldown', async () => {
  const oldToken = receivedToken();
  const email = `verification-${marker}@example.com`;
  await request(app.getHttpServer())
    .post('/auth/resend-verification')
    .send({ email })
    .expect(200);
  assert.equal(messages.length, 2);
  assert.notEqual(receivedToken(), oldToken);
  await request(app.getHttpServer())
    .post('/auth/resend-verification')
    .send({ email })
    .expect(429);
});
await test('invalid, expired and session tokens do not activate the user', async () => {
  const email = `verification-${marker}@example.com`;
  const expired = await jwt.signAsync(
    { sub: ids[0], email, purpose: 'email-verification' },
    {
      secret,
      expiresIn: -1,
      audience: 'perpus-email-verification',
      issuer: 'perpus-api',
    },
  );
  const session = await jwt.signAsync({
    sub: ids[0],
    email,
    role: 'PENGUNJUNG',
  });
  for (const token of ['invalid', expired, session])
    await request(app.getHttpServer())
      .get('/auth/verify-email')
      .query({ token })
      .expect(400);
  assert.equal(
    (await prisma.user.findUnique({ where: { id: ids[0] } })).emailVerified,
    false,
  );
});
await test('valid link activates MySQL user; repeat is safe; verified member and admin can login', async () => {
  const token = receivedToken();
  const response = await request(app.getHttpServer())
    .get('/auth/verify-email')
    .query({ token })
    .expect(200);
  assert.equal(response.body.emailVerified, true);
  assert.equal(response.headers['cache-control'], 'no-store');
  assert.equal(response.headers['referrer-policy'], 'no-referrer');
  assert.equal(
    (await prisma.user.findUnique({ where: { id: ids[0] } })).emailVerified,
    true,
  );
  await request(app.getHttpServer())
    .get('/auth/verify-email')
    .query({ token })
    .expect(200);
  const email = `verification-${marker}@example.com`;
  const member = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(201);
  assert.ok(member.headers['set-cookie']);
  await prisma.user.update({ where: { id: ids[0] }, data: { role: 'ADMIN' } });
  const admin = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(201);
  assert.equal(admin.body.user.role, 'ADMIN');
  await request(app.getHttpServer())
    .post('/auth/resend-verification')
    .send({ email })
    .expect(200);
  assert.equal(messages.length, 2);
});
if (process.env.AUTH_FRONTEND_SMOKE === '1') await test('frontend pages, API proxies and server role protection', async () => {
  const base = 'http://localhost:3000';
  const email = `verification-${marker}@example.com`;
  const call = (path, body, cookie) => fetch(`${base}${path}`, { method: body ? 'POST' : 'GET', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  for (const path of ['/forgot-password', '/reset-password?token=invalid', '/verify-email?token=invalid', '/check-email']) assert.equal((await call(path)).status, 200);
  for (const path of ['/admin', '/pengunjung']) {
    const result = await call(path);
    assert.equal(result.status, 307); assert.ok(result.headers.get('location').endsWith('/login'));
  }
  await prisma.user.update({ where: { id: ids[0] }, data: { role: 'PENGUNJUNG' } });
  const login = await call('/api/auth/login', { email, password });
  assert.equal(login.status, 201);
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const me = await call('/api/auth/me', undefined, cookie);
  assert.equal(me.status, 200); assert.equal((await me.json()).emailVerified, true);
  assert.equal((await call('/pengunjung', undefined, cookie)).status, 200);
  const denied = await call('/admin', undefined, cookie);
  assert.equal(denied.status, 307); assert.ok(denied.headers.get('location').endsWith('/pengunjung'));
  await prisma.user.update({ where: { id: ids[0] }, data: { role: 'ADMIN' } });
  assert.equal((await call('/admin', undefined, cookie)).status, 200);
  const verify = await call(`/api/auth/verify-email?token=${receivedToken()}`);
  assert.equal(verify.status, 200); assert.equal((await verify.json()).alreadyVerified, true);
  assert.equal((await call('/api/auth/verify-email?token=invalid')).status, 400);
  assert.equal((await call('/api/auth/resend-verification', { email })).status, 200);
  const logout = await call('/api/auth/logout', {} , cookie);
  assert.equal(logout.status, 200); assert.ok(logout.headers.get('set-cookie').includes('Expires='));
  assert.equal((await call('/api/auth/me')).status, 401);
});
await test('session, logout and one-use reset work with MySQL and the existing mailer', async () => {
  const email = `verification-${marker}@example.com`;
  const agent = request.agent(app.getHttpServer());
  const remembered = await agent.post('/auth/login').send({ email, password, remember: true }).expect(201);
  const sessionToken = decodeURIComponent(remembered.headers['set-cookie'][0].split(';')[0].slice('perpus_session='.length));
  const sessionPayload = await jwt.verifyAsync(sessionToken);
  assert.equal(sessionPayload.exp - sessionPayload.iat, 30 * 24 * 60 * 60);
  const me = await agent.get('/auth/me').expect(200);
  assert.equal(me.body.emailVerified, true);
  assert.equal(me.body.role, 'ADMIN');
  assert.equal(me.body.passwordHash, undefined);
  const logout = await agent.post('/auth/logout').expect(201);
  assert.ok(logout.headers['set-cookie'][0].includes('Expires='));
  await agent.get('/auth/me').expect(401);
  const oldSession = request.agent(app.getHttpServer());
  await oldSession.post('/auth/login').send({ email, password }).expect(201);
  await request(app.getHttpServer()).post('/auth/forgot-password').send({ email }).expect(200);
  const token = receivedToken();
  const newPassword = randomUUID();
  await request(app.getHttpServer()).post('/auth/reset-password').send({ token, password: 'short' }).expect(400);
  await request(app.getHttpServer()).post('/auth/reset-password').send({ token: 'invalid', password: newPassword }).expect(400);
  const expired = await jwt.signAsync({ sub: ids[0], email, purpose: 'password-reset' }, { secret: settings.PASSWORD_RESET_SECRET, expiresIn: -1, audience: 'perpus-password-reset', issuer: 'perpus-api' });
  await request(app.getHttpServer()).post('/auth/reset-password').send({ token: expired, password: newPassword }).expect(400);
  const reset = await request(app.getHttpServer()).post('/auth/reset-password').send({ token, password: newPassword }).expect(200);
  assert.equal(reset.body.message, 'Password berhasil diperbarui.');
  await request(app.getHttpServer()).post('/auth/reset-password').send({ token, password: newPassword }).expect(400);
  await oldSession.get('/auth/me').expect(401);
  const saved = await prisma.user.findUnique({ where: { id: ids[0] } });
  assert.notEqual(saved.passwordHash, newPassword);
  assert.ok(await bcrypt.compare(newPassword, saved.passwordHash));
  await request(app.getHttpServer()).post('/auth/login').send({ email, password }).expect(401);
  await request(app.getHttpServer()).post('/auth/login').send({ email, password: newPassword }).expect(201);
});
await test('SMTP unavailable preserves new pending account and never claims delivery', async () => {
  await new Promise((resolve) => smtp.close(resolve));
  const email = `verification-${marker}-unavailable@example.com`;
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({
      name: 'SMTP Failure Test',
      email,
      whatsapp: '081234567890',
      address: 'Pekanbaru',
      identity: '00123456789',
      password,
      memberType: 'pegawai',
      division: 'Pelayanan',
    })
    .expect(201);
  ids.push(response.body.data.id);
  await request(app.getHttpServer()).post('/auth/forgot-password').send({ email }).expect(503);
  assert.equal(response.body.verificationEmailSent, false);
  assert.equal(response.body.data.emailVerified, false);
  const saved = await prisma.user.findUnique({ where: { email } });
  assert.equal(saved.emailVerified, false);
  assert.ok(await bcrypt.compare(password, saved.passwordHash));
  await request(app.getHttpServer())
    .post('/auth/resend-verification')
    .send({ email })
    .expect(503);
  settings.SMTP_HOST = '';
  const unconfigured = await request(app.getHttpServer()).post('/auth/resend-verification').send({ email }).expect(503);
  assert.equal(unconfigured.body.message, 'Layanan email belum dikonfigurasi.');
});
after(async () => {
  if (prisma && ids.length)
    await prisma.$transaction(async (tx) => {
      await tx.memberProfile.deleteMany({ where: { userId: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
  await app?.close();
  for (const socket of sockets) socket.destroy();
  if (smtp.listening) await new Promise((resolve) => smtp.close(resolve));
});
