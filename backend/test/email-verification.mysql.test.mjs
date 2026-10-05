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
  prisma = module.get(PrismaService);
  jwt = module.get(JwtService);
  await app.init();
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
  assert.equal(response.body.verificationEmailSent, false);
  assert.equal(response.body.data.emailVerified, false);
  const saved = await prisma.user.findUnique({ where: { email } });
  assert.equal(saved.emailVerified, false);
  assert.ok(await bcrypt.compare(password, saved.passwordHash));
  await request(app.getHttpServer())
    .post('/auth/resend-verification')
    .send({ email })
    .expect(503);
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
