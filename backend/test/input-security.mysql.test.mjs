import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';
import request from 'supertest';
import { PrismaService } from '../dist/prisma/prisma.service.js';
import { AuthController } from '../dist/auth/auth.controller.js';
import { AuthService } from '../dist/auth/auth.service.js';
import { JwtAuthGuard } from '../dist/auth/jwt-auth.guard.js';
import { RecaptchaService } from '../dist/auth/recaptcha.service.js';
import { PasswordResetService } from '../dist/auth/password-reset.service.js';
import { EmailVerificationService } from '../dist/auth/email-verification.service.js';
import { MembersService } from '../dist/members/members.service.js';
import { MembersController, MemberCirculationController } from '../dist/members/members.controller.js';
import { MemberRoleGuard } from '../dist/members/member-role.guard.js';
import { ActiveBookGuard } from '../dist/members/active-book.guard.js';
import { AdminMembersController } from '../dist/members/admin-members.controller.js';
import { AdminMembersService } from '../dist/members/admin-members.service.js';
import { AdminTransactionsController } from '../dist/members/admin-transactions.controller.js';
import { AdminTransactionsService } from '../dist/members/admin-transactions.service.js';
import { AdminBooksController } from '../dist/admin-books/admin-books.controller.js';
import { AdminBooksService } from '../dist/admin-books/admin-books.service.js';
import { AdminEBooksController } from '../dist/admin-ebooks/admin-ebooks.controller.js';
import { AdminEBooksService } from '../dist/admin-ebooks/admin-ebooks.service.js';
import { AdminRoleGuard } from '../dist/admin-books/admin-role.guard.js';
import { AdminGrantsController } from '../dist/grants/admin-grants.controller.js';
import { AdminGrantsService } from '../dist/grants/admin-grants.service.js';
import { CollectionsController } from '../dist/collections/collections.controller.js';
import { CollectionsService } from '../dist/collections/collections.service.js';
import { GrantsController } from '../dist/grants/grants.controller.js';
import { GrantsService } from '../dist/grants/grants.service.js';
import { ContactController } from '../dist/contact/contact.controller.js';
import { ContactService } from '../dist/contact/contact.service.js';
import { MailService } from '../dist/mail/mail.service.js';
import { PublicRateGuard } from '../dist/security/public-rate.guard.js';
import { configureHttpSecurity } from '../dist/security/http-security.js';

// Explicit opt-in. Only UUID-labelled fixtures are written and their exact IDs
// removed. No external mail, background processing, schema change or broad delete.
if (process.env.RUN_INPUT_SECURITY_MYSQL !== '1') throw new Error('Set RUN_INPUT_SECURITY_MYSQL=1 to run the scoped MySQL security checks.');
const databaseUrl = process.env.DATABASE_URL;
assert.ok(databaseUrl && ['/perpus_db', '/perpus_registration_test'].includes(new URL(databaseUrl).pathname));
const prefix = `sec-${randomUUID().slice(0, 12)}`;
const password = " <A&'bcdef> ";
const secret = randomUUID() + randomUUID();
const settings = { DATABASE_URL: databaseUrl, JWT_SECRET: secret, NODE_ENV: 'test', FRONTEND_URL: 'http://localhost:3000' };
const config = { get: key => settings[key], getOrThrow: key => { if (!settings[key]) throw new Error('Missing test config'); return settings[key]; } };
const prisma = new PrismaService(config);
const userIds = [], bookIds = [], grantIds = [], emails = [];
emails.push(`${prefix}-bad@example.test`);
const mail = { isConfigured: () => false, sendContactEmail: async () => true, sendMemberReminder: async () => { throw new Error('External mail disabled'); } };
// Scope expiry scans to fixtures, keeping the actual expiry/transaction code.
const scopedPrisma = Object.create(prisma);
Object.defineProperty(scopedPrisma, 'reservation', { value: new Proxy(prisma.reservation, { get(target, property) {
  if (property === 'findMany') return args => target.findMany({ ...args, where: { AND: [args.where ?? {}, { userId: { in: userIds } }] } });
  return target[property];
} }) });
const members = new MembersService(scopedPrisma, mail);
members.onModuleInit = () => {}; // Never start the shared reminder scheduler in this test.
let app;
let fixtureWritesAttempted = false;
let phase = 'database connection';
try {
  await prisma.$connect();
  // Read mode metadata without changing server/session settings. The adapter's
  // connector is patched for NO_BACKSLASH_ESCAPES, verified separately.
  const modes = await prisma.$queryRaw`SELECT @@SESSION.sql_mode AS modes, @@SESSION.character_set_client AS charset`;
  assert.equal(typeof modes[0].modes, 'string');
  assert.equal(typeof modes[0].charset, 'string');
  const module = await Test.createTestingModule({
    imports: [JwtModule.register({ secret })],
    controllers: [AuthController, MembersController, MemberCirculationController, AdminMembersController, AdminTransactionsController, AdminBooksController, AdminEBooksController, AdminGrantsController, CollectionsController, GrantsController, ContactController],
    providers: [AuthService, JwtAuthGuard, RecaptchaService, MemberRoleGuard, ActiveBookGuard, AdminRoleGuard, AdminMembersService, AdminTransactionsService, AdminBooksService, AdminEBooksService, AdminGrantsService, CollectionsService, GrantsService, ContactService,
      { provide: PrismaService, useValue: prisma }, { provide: ConfigService, useValue: config }, { provide: MembersService, useValue: members }, { provide: MailService, useValue: mail },
      { provide: PasswordResetService, useValue: {} }, { provide: EmailVerificationService, useValue: { sendRegistrationVerification: async () => false } },
      { provide: APP_GUARD, useClass: PublicRateGuard }],
  }).compile();
  app = module.createNestApplication({ logger: false, bodyParser: false });
  app.use(cookieParser()); configureHttpSecurity(app, ['http://localhost:3000']); await app.init();
  const api = request(app.getHttpServer());
  phase = 'registration/public input';
  fixtureWritesAttempted = true;
  const valid = { name: "O'Connor", whatsapp: '0811-6904-422', address: 'Jl. Jend. Sudirman No.233\nHukum & HAM / R&D', identity: prefix, password, confirmPassword: password, consent: true };
  for (const memberType of ['umum', 'mahasiswa', 'pegawai']) {
    const email = `${prefix}-${memberType}@example.test`; emails.splice(emails.length - 1, 0, email);
    const response = await api.post('/auth/register').send({ ...valid, email, memberType, ...(memberType === 'mahasiswa' ? { university: 'Universitas Islam Negeri' } : {}), ...(memberType === 'pegawai' ? { division: 'Hukum & HAM' } : {}) }).expect(201);
    const user = await prisma.user.findUnique({ where: { email }, include: { memberProfile: true } }); userIds.push(user.id);
    assert.equal(response.body.data.emailVerified, false); assert.equal(user.role, 'PENGUNJUNG'); assert.equal(user.emailVerified, false);
    assert.notEqual(user.passwordHash, password); assert.ok(await bcrypt.compare(password, user.passwordHash)); assert.equal(user.name, valid.name);
  }
  await api.post('/auth/register').send({ ...valid, memberType: 'umum', email: emails[0] }).expect(409);
  await api.post('/auth/register').send({ ...valid, memberType: 'umum', email: `${prefix}-bad@example.test`, role: 'ADMIN' }).expect(400);
  const payloads = ['<p>test</p>', '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<svg onload=alert(1)>', '<a href="javascript:alert(1)">test</a>', '<div onclick="alert(1)">test</div>'];
  for (const payload of payloads) {
    await api.post('/auth/register').send({ ...valid, email: `${prefix}-bad@example.test`, memberType: 'umum', name: payload }).expect(400);
    for (const path of ['/collections', '/ebooks', '/grants']) await api.get(path).query({ search: payload }).expect(400);
    await api.post('/contact').send({ name: 'Nama', email: `${prefix}-contact@example.test`, message: payload }).expect(400);
  }
  for (const userId of userIds) await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
  const hash = await bcrypt.hash(password, 12);
  const adminEmail = `${prefix}-admin@example.test`; emails.push(adminEmail);
  const admin = await prisma.user.create({ data: { name: prefix, email: adminEmail, role: 'ADMIN', emailVerified: true, passwordHash: hash } }); userIds.push(admin.id);
  async function cookie(email) {
    const result = await api.post('/auth/login').send({ email, password }).expect(201);
    return result.headers['set-cookie'][0].split(';')[0];
  }
  const owner = await cookie(emails[0]), other = await cookie(emails[1]), adminCookie = await cookie(adminEmail);
  phase = 'admin inputs/roles';
  const bookBody = { code: `${prefix}-book`, title: 'Hukum & HAM', author: "O'Connor", isbnIssn: '', publisher: 'R&D', year: 2026, edition: '', language: 'Indonesia', subject: 'Hukum', location: 'Lantai 1', shelf: 'A-1', totalStock: 1, description: 'Data fixture keamanan', coverUrl: '/images/landing/book-placeholder-1.svg', isActive: true };
  const ebookBody = { code: `${prefix}-ebook`, title: bookBody.title, author: bookBody.author, isbnIssn: '', publisher: bookBody.publisher, year: 2026, edition: '', language: 'Indonesia', subject: 'Hukum', description: bookBody.description, coverUrl: bookBody.coverUrl, accessMode: 'BACA_DI_WEBSITE', ebookUrl: '/ebooks/contoh-1.html', accessDurationDays: null, licenseNote: '', isActive: true };
  const bookResult = await api.post('/admin/books').set('Cookie', adminCookie).send(bookBody).expect(201); bookIds.push(bookResult.body.book.id);
  const ebookResult = await api.post('/admin/ebooks').set('Cookie', adminCookie).send(ebookBody).expect(201); bookIds.push(ebookResult.body.book.id);
  const grantBody = { donorName: `O'Connor / ${prefix}`, receivedAt: '2026-10-12', status: 'BELUM_DIKATALOGKAN', note: '', items: [{ title: 'Hukum & HAM', quantity: 1 }] };
  const grantResult = await api.post('/admin/grants').set('Cookie', adminCookie).send(grantBody).expect(201); grantIds.push(grantResult.body.grant.id);
  for (const payload of payloads) {
    await api.patch(`/admin/books/${bookIds[0]}`).set('Cookie', adminCookie).send({ ...bookBody, title: payload }).expect(400);
    await api.patch(`/admin/ebooks/${bookIds[1]}`).set('Cookie', adminCookie).send({ ...ebookBody, licenseNote: payload }).expect(400);
    await api.patch(`/admin/grants/${grantIds[0]}`).set('Cookie', adminCookie).send({ ...grantBody, note: payload }).expect(400);
    await api.patch('/members/me/profile').set('Cookie', owner).send({ name: payload }).expect(400);
  }
  for (const url of ['javascript:alert(1)', 'data:text/html,test', 'vbscript:msgbox(1)']) await api.patch(`/admin/ebooks/${bookIds[1]}`).set('Cookie', adminCookie).send({ ...ebookBody, ebookUrl: url }).expect(400);
  for (const path of ['/admin/books', '/admin/ebooks', '/admin/grants', '/members/admin/members', '/members/admin/transactions/loans']) {
    await api.get(path).set('Cookie', owner).expect(403); await api.get(path).expect(401);
    await api.get(path).set('Cookie', adminCookie).query({ search: '<script>alert(1)</script>' }).expect(400);
  }
  for (const input of ["' OR '1'='1", "'; DROP TABLE users; --", "O'Connor", 'R&D', 'Hukum & HAM']) {
    const response = await api.get('/collections').query({ search: input }).expect(200);
    if (input.startsWith("'")) assert.equal(response.body.meta.total, 0);
    await api.get('/admin/books').set('Cookie', adminCookie).query({ search: input }).expect(200);
  }
  const reservation = await api.post('/members/me/reservations').set('Cookie', owner).send({ bookId: bookIds[0] }).expect(201);
  phase = 'member ownership and circulation';
  const reservationId = reservation.body.reservation.id;
  await api.patch(`/members/me/reservations/${reservationId}/cancel`).set('Cookie', other).send({}).expect(404);
  await api.post(`/members/admin/reservations/${reservationId}/pickup`).set('Cookie', owner).send({}).expect(403);
  const pickup = await api.post(`/members/admin/reservations/${reservationId}/pickup`).set('Cookie', adminCookie).send({}).expect(201);
  const loanId = pickup.body.loan.id;
  const dueAt = new Date(pickup.body.loan.dueAt);
  await api.post(`/members/me/loans/${loanId}/extend`).set('Cookie', other).send({ expectedDueAt: dueAt.toISOString() }).expect(404);
  await api.post(`/members/me/loans/${loanId}/extend`).set('Cookie', owner).send({ expectedDueAt: dueAt.toISOString(), userId: userIds[1] }).expect(400);
  await api.post(`/members/me/loans/${loanId}/extend`).set('Cookie', owner).send({ expectedDueAt: dueAt.toISOString() }).expect(201);
  assert.equal((await prisma.loan.findUnique({ where: { id: loanId } })).dueAt.getTime() - dueAt.getTime(), 7 * 86400000);
  const notice = await prisma.notification.findFirst({ where: { userId: userIds[0] } });
  await api.patch(`/members/me/notifications/${notice.id}/read`).set('Cookie', other).send({}).expect(404);
  assert.equal((await prisma.notification.findUnique({ where: { id: notice.id } })).readAt, null);
  await api.patch(`/members/me/notifications/${notice.id}/read`).set('Cookie', owner).send({}).expect(200);
  await api.post('/members/me/ebooks').set('Cookie', owner).send({ bookId: bookIds[1] }).expect(201);
  await api.patch(`/members/me/ebooks/${bookIds[1]}/progress`).set('Cookie', other).send({ progress: 100, lastPosition: 1, expectedVersion: 0 }).expect(404);
  await api.patch(`/members/me/ebooks/${bookIds[1]}/progress`).set('Cookie', owner).send({ progress: '<b>x</b>', lastPosition: 1, expectedVersion: 0 }).expect(400);
  await api.patch(`/members/me/ebooks/${bookIds[1]}/progress`).set('Cookie', owner).send({ progress: 42, lastPosition: 0.42, expectedVersion: 0 }).expect(200);
  assert.equal(await prisma.user.count({ where: { email: `${prefix}-bad@example.test` } }), 0);
  assert.equal((await prisma.book.findUnique({ where: { id: bookIds[0] } })).title, bookBody.title);
  console.log('PASS MySQL HTTP security: 3 registration roles, hash/pending/duplicate, public/admin/member HTML, safe URLs, SQL data, actual JWT+roles, ownership reservations/loans/notifications/ebooks, +7 days; external SMTP disabled.');
} catch (error) {
  console.error(`FAIL MySQL security during ${phase} (${error.code ?? error.name}); no credentials or input values logged.`);
  process.exitCode = 1;
} finally {
  try {
  if (fixtureWritesAttempted) {
  // Exact UUID email list covers even a write followed by a failed HTTP assertion.
  const fixtures = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  const ids = fixtures.map(user => user.id);
  const ownedBooks = await prisma.book.findMany({ where: { code: { in: [`${prefix}-book`, `${prefix}-ebook`] } }, select: { id: true } });
  const books = ownedBooks.map(book => book.id);
  const grants = await prisma.bookGrant.findMany({ where: { donorName: `O'Connor / ${prefix}` }, select: { id: true } });
  const grantsToRemove = grants.map(grant => grant.id);
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.userEBook.deleteMany({ where: { userId: { in: ids } } });
  await prisma.loanExtension.deleteMany({ where: { loan: { userId: { in: ids } } } });
  await prisma.loan.deleteMany({ where: { userId: { in: ids } } });
  await prisma.reservation.deleteMany({ where: { userId: { in: ids } } });
  await prisma.bookCopy.deleteMany({ where: { bookId: { in: books } } });
  await prisma.book.deleteMany({ where: { id: { in: books } } });
  await prisma.bookGrantItem.deleteMany({ where: { grantId: { in: grantsToRemove } } });
  await prisma.bookGrant.deleteMany({ where: { id: { in: grantsToRemove } } });
  await prisma.memberProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  assert.equal(await prisma.user.count({ where: { email: { in: emails } } }), 0);
  console.log('PASS cleanup: exact test fixtures removed; schema and existing application data preserved.');
  }
  } catch {
    console.error('FAIL test fixture cleanup; inspect the UUID-scoped fixtures before repeating this test.');
    process.exitCode = 1;
  } finally {
    if (app) await app.close();
    await prisma.$disconnect();
  }
}
