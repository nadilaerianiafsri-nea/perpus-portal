import { BadRequestException, type ExecutionContext, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AdminMembersController } from './admin-members.controller';
import { AdminMembersService } from './admin-members.service';
import { AdminTransactionsController } from './admin-transactions.controller';
import { AdminTransactionsService } from './admin-transactions.service';
import { MemberRoleGuard } from './member-role.guard';
import { MembersController, MemberCirculationController } from './members.controller';
import { MembersService } from './members.service';
import { positiveId, profileInput } from './member.validation';

describe('member input security', () => {
  it.each(['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<b>Nama</b>'])('rejects HTML in profile text: %s', (name) => {
    expect(() => profileInput({ name }, 'UMUM')).toThrow('Input tidak boleh mengandung HTML.');
  });
  it.each(['name', 'address', 'universityName', 'workUnit'])('rejects HTML in %s', (field) => {
    expect(() => profileInput({ [field]: '<b>data</b>' }, field === 'universityName' ? 'MAHASISWA' : 'PEGAWAI')).toThrow(BadRequestException);
  });
  it('preserves apostrophes, ampersands and multiline addresses', () => {
    expect(profileInput({ name: "O'Connor", address: 'Jl. R&D No. 2\nHukum & HAM' }, 'UMUM')).toEqual({ name: "O'Connor", address: 'Jl. R&D No. 2\nHukum & HAM' });
  });
  it.each([{ name: { text: 'Nama' } }, { role: 'ADMIN' }, { name: 'abc\u0000def' }, { name: 'a'.repeat(192) }])('rejects malformed profile values', (body) => {
    expect(() => profileInput(body, 'UMUM')).toThrow(BadRequestException);
  });
  it.each(['0', '-1', '1.5', '2147483648', ['1'], {}, '9007199254740993'])('rejects unsafe IDs: %j', (id) => {
    expect(() => positiveId(id)).toThrow(BadRequestException);
  });
});

describe('member and admin HTTP security boundary', () => {
  let app: INestApplication;
  const prisma = {
    user: { findUnique: async ({ where }: { where: { id: number } }) => ({ role: where.id === 99 ? 'ADMIN' : 'PENGUNJUNG', emailVerified: true, isActive: true }), count: async () => 0, groupBy: async () => [], findMany: async () => [], findFirst: async () => null },
  };
  const circulation = {
    cancel: async () => ({}), readAll: async () => ({}), read: async () => ({}), openEBook: async () => ({}), pickup: async () => ({}), finishLoan: async () => ({}), expireReservations: async () => {},
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MembersController, MemberCirculationController, AdminMembersController, AdminTransactionsController],
      providers: [MemberRoleGuard, AdminMembersService, AdminTransactionsService, { provide: PrismaService, useValue: prisma }, { provide: MembersService, useValue: circulation }],
    }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context: ExecutionContext) { const req = context.switchToHttp().getRequest(); req.user = { sub: req.headers['x-test-admin'] ? 99 : 1 }; return true; } }).compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => { await app.close(); });
  const validMember = { name: "O'Connor", memberType: 'UMUM', whatsapp: '081234567890', address: 'Jl. R&D\nHukum & HAM', identityNumber: 'ID-123', universityName: null, workUnit: null };
  it.each(['name', 'address', 'identityNumber', 'universityName', 'workUnit'])('rejects HTML in admin member %s even when inactive for member type', async (field) => {
    await request(app.getHttpServer()).patch('/members/admin/members/1').set('x-test-admin', 'true').send({ ...validMember, [field]: '<b>text</b>' }).expect(400);
  });
  it.each(['universityName', 'workUnit'])('rejects nontext optional admin %s', async (field) => {
    await request(app.getHttpServer()).patch('/members/admin/members/1').set('x-test-admin', 'true').send({ ...validMember, [field]: { privileged: true } }).expect(400);
  });
  it('accepts legitimate text and nullable inactive fields before normal not-found handling', async () => {
    await request(app.getHttpServer()).patch('/members/admin/members/1').set('x-test-admin', 'true').send(validMember).expect(404);
  });
  it.each(['/members/admin/members', '/members/admin/transactions/reservations', '/members/admin/transactions/loans', '/members/admin/transactions/returns', '/members/admin/transactions/lost-books'])('rejects malformed query data on %s', async (path) => {
    for (const query of ['search=a&search=b', 'page=1&page=2', 'search=%3Cb%3Ex%3C%2Fb%3E', 'role=ADMIN', 'page=2147483648', 'limit=101']) {
      await request(app.getHttpServer()).get(`${path}?${query}`).set('x-test-admin', 'true').expect(400);
    }
  });
  it.each(['/members/admin/members', '/members/admin/transactions/reservations', '/members/admin/transactions/loans', '/members/admin/transactions/returns', '/members/admin/transactions/lost-books'])('rejects nonadmin on %s', async (path) => {
    await request(app.getHttpServer()).get(path).expect(403);
  });
  it.each([['patch', '/members/me/reservations/1/cancel'], ['patch', '/members/me/notifications/read-all'], ['patch', '/members/me/notifications/1/read'], ['post', '/members/admin/reservations/1/pickup'], ['post', '/members/admin/loans/1/return'], ['post', '/members/admin/loans/1/lost']])('rejects arbitrary bodies on %s %s', async (method, path) => {
    const call = method === 'post' ? request(app.getHttpServer()).post(path) : request(app.getHttpServer()).patch(path);
    await call.set('x-test-admin', path.includes('/admin/') ? 'true' : '').send({ userId: 2, role: 'ADMIN', isActive: true }).expect(400);
  });
  it('uses SQL-like search only as Prisma string data', async () => {
    await request(app.getHttpServer()).get('/members/admin/members').query({ search: "' OR 1=1 --" }).set('x-test-admin', 'true').expect(200);
  });
});
