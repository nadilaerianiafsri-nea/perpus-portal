import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import request from 'supertest';
import bcrypt from 'bcrypt';
import mariadb from 'mariadb';
import { AuthController } from '../dist/auth/auth.controller.js';
import { AuthService } from '../dist/auth/auth.service.js';
import { JwtAuthGuard } from '../dist/auth/jwt-auth.guard.js';
import { PrismaService } from '../dist/prisma/prisma.service.js';

// Never run this write/rollback test against an application database.
const databaseUrl = process.env.REGISTRATION_TEST_DATABASE_URL;
if (
  !databaseUrl ||
  new URL(databaseUrl).pathname !== '/perpus_registration_test'
) {
  throw new Error(
    'Set REGISTRATION_TEST_DATABASE_URL to the isolated perpus_registration_test database.',
  );
}
const prefix = randomUUID();
const secret = randomUUID();
const ids = [];
let app;
let prisma;
const valid = {
  name: 'Registration Test',
  email: `${prefix}@example.com`,
  whatsapp: '081234567890',
  address: 'Pekanbaru',
  identity: '00123456789',
  password: 'registration-test-password',
  memberType: 'umum',
  consent: true,
};

before(async () => {
  const module = await Test.createTestingModule({
    imports: [JwtModule.register({ secret })],
    controllers: [AuthController],
    providers: [
      AuthService,
      PrismaService,
      JwtAuthGuard,
      {
        provide: ConfigService,
        useValue: {
          getOrThrow: (key) => (key === 'DATABASE_URL' ? databaseUrl : secret),
        },
      },
    ],
  }).compile();
  app = module.createNestApplication({ logger: false });
  prisma = module.get(PrismaService);
  await app.init();
});

await test('three membership types persist correctly in MySQL with hashed passwords and pending status', async () => {
  for (const { memberType, extra } of [
    { memberType: 'umum', extra: { university: 'ignored', division: 'ignored' } },
    { memberType: 'mahasiswa', extra: { university: 'Universitas Riau', division: 'ignored' } },
    { memberType: 'pegawai', extra: { division: 'Pelayanan', university: 'ignored' } },
  ]) {
    const email = `${prefix}-${memberType}@example.com`;
    const response = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...valid, email, memberType, ...extra })
      .expect(201);
    ids.push(response.body.data.id);
    assert.equal(response.headers['set-cookie'], undefined);
    assert.equal(response.body.token, undefined);
    assert.equal(response.body.data.emailVerified, false);
    assert.equal(JSON.stringify(response.body).includes('password'), false);
    const saved = await prisma.user.findUnique({
      where: { email },
      include: { memberProfile: true },
    });
    assert.equal(saved.role, 'PENGUNJUNG');
    assert.equal(saved.memberType, memberType.toUpperCase());
    assert.equal(saved.emailVerified, false);
    assert.equal(saved.memberProfile.userId, saved.id);
    assert.equal(saved.memberProfile.whatsapp, valid.whatsapp);
    assert.equal(saved.memberProfile.identityNumber, valid.identity);
    assert.equal(saved.memberProfile.address, valid.address);
    assert.equal(
      saved.memberProfile.universityName,
      memberType === 'mahasiswa' ? extra.university : null,
    );
    assert.equal(
      saved.memberProfile.workUnit,
      memberType === 'pegawai' ? extra.division : null,
    );
    assert.notEqual(saved.passwordHash, valid.password);
    assert.equal(
      await bcrypt.compare(valid.password, saved.passwordHash),
      true,
    );
  }
});
await test('duplicate email returns 409 and invalid inputs return 400 without inserts', async () => {
  await request(app.getHttpServer())
    .post('/auth/register')
    .send({ ...valid, email: `${prefix}-UMUM@EXAMPLE.COM` })
    .expect(409);
  const count = await prisma.user.count();
  for (const change of [
    { password: 'short' },
    { memberType: 'mahasiswa' },
    { memberType: 'pegawai' },
    { memberType: 'invalid' },
    { role: 'ADMIN' },
    { whatsapp: ' ' },
    { identity: 123 },
    { email: 'bad@' },
  ]) {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...valid, ...change })
      .expect(400);
  }
  assert.equal(await prisma.user.count(), count);
});
await test('profile failure rolls back the User insert in a real MySQL transaction', async () => {
  // MySQL CREATE TRIGGER is unavailable through the prepared-statement protocol.
  const url = new URL(databaseUrl);
  const connection = await mariadb.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
  });
  await connection.query(
    "CREATE TRIGGER registration_test_reject_profile BEFORE INSERT ON member_profiles FOR EACH ROW BEGIN IF NEW.identityNumber = 'registration-test-rollback' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Test profile failure'; END IF; END",
  );
  try {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({ ...valid, identity: 'registration-test-rollback' })
      .expect(500);
    assert.equal(
      await prisma.user.findUnique({ where: { email: valid.email } }),
      null,
    );
  } finally {
    await connection.query('DROP TRIGGER registration_test_reject_profile');
    await connection.end();
  }
});
await test('concurrent requests for one email produce one account and a Conflict', async () => {
  const email = `${prefix}-race@example.com`;
  const responses = await Promise.all(
    [1, 2].map(() =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ ...valid, email }),
    ),
  );
  assert.deepEqual(
    responses.map((response) => response.status).sort((a, b) => a - b),
    [201, 409],
  );
  ids.push(responses.find((response) => response.status === 201).body.data.id);
  assert.equal(await prisma.user.count({ where: { email } }), 1);
});
await test('pending member cannot login; verified member and admin retain their login cookies', async () => {
  const email = `${prefix}-umum@example.com`;
  await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: valid.password })
    .expect(403);
  await prisma.user.update({ where: { email }, data: { emailVerified: true } });
  const member = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: valid.password })
    .expect(201);
  assert.ok(member.headers['set-cookie']);
  await prisma.user.update({ where: { email }, data: { role: 'ADMIN' } });
  const admin = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password: valid.password })
    .expect(201);
  assert.equal(admin.body.user.role, 'ADMIN');
  assert.ok(admin.headers['set-cookie']);
});

after(async () => {
  if (prisma)
    await prisma.$transaction(async (tx) => {
      await tx.memberProfile.deleteMany({ where: { userId: { in: ids } } });
      await tx.user.deleteMany({ where: { id: { in: ids } } });
    });
  await app?.close();
});
