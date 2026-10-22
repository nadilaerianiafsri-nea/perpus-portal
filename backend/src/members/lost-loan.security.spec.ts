import { Test } from '@nestjs/testing';
import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { configureHttpSecurity } from '../security/http-security';
import { MemberRoleGuard } from './member-role.guard';
import { MembersController, MemberCirculationController } from './members.controller';
import { EBookCirculationService } from './ebook-circulation.service';
import { MembersService } from './members.service';

describe('lost-book HTTP authentication, ownership and mutation boundary', () => {
  let app: NestExpressApplication;
  const row = { id: 7, userId: 1, bookId: 2, copyId: 3, status: 'AKTIF', returnedAt: null, extensionCount: 0,
    borrowedAt: new Date(), dueAt: new Date(Date.now() + 86400000), lostReportStatus: null,
    book: { id: 2, title: 'Buku', code: 'BK2', type: 'FISIK' }, copy: { id: 3, bookId: 2, status: 'DIPINJAM' } };
  const tx = { $queryRaw: async () => [], loan: { findUnique: async () => row, update: jest.fn(async ({ data }) => Object.assign(row, data)) },
    bookCopy: { updateMany: jest.fn(async () => ({ count: 1 })) }, notification: { createMany: async () => ({ count: 1 }) } };
  const prisma = { ...tx, $transaction: async (work: (value: typeof tx) => Promise<unknown>) => work(tx),
    user: { findUnique: async ({ where }: { where: { id: number } }) => ({ role: where.id === 99 ? 'ADMIN' : 'PENGUNJUNG', emailVerified: true, isActive: true }) } };
  beforeAll(async () => {
    const members = new MembersService(prisma as never, {} as never);
    jest.spyOn(members, 'onModuleInit').mockImplementation(() => {});
    const module = await Test.createTestingModule({ controllers: [MembersController, MemberCirculationController], providers: [MemberRoleGuard,
      { provide: PrismaService, useValue: prisma }, { provide: MembersService, useValue: members }, { provide: EBookCirculationService, useValue: {} },
    ] }).overrideGuard(JwtAuthGuard).useValue({ canActivate(context: ExecutionContext) {
      const req = context.switchToHttp().getRequest<{ headers: Record<string, string>; user?: { sub: number } }>();
      if (!req.headers['x-test-session']) throw new UnauthorizedException();
      req.user = { sub: Number(req.headers['x-test-session']) }; return true;
    } }).compile();
    app = module.createNestApplication<NestExpressApplication>({ bodyParser: false });
    configureHttpSecurity(app, ['http://portal.test']);
    await app.init();
  });
  beforeEach(() => { row.userId = 1; row.book.type = 'FISIK'; row.status = 'AKTIF'; row.lostReportStatus = null; tx.loan.update.mockClear(); tx.bookCopy.updateMany.mockClear(); });
  afterAll(async () => { await app.close(); });
  it('requires authenticated member, rejects admin at member endpoint and member at admin mutations', async () => {
    await request(app.getHttpServer()).post('/members/me/loans/7/lost-report').send({}).expect(401);
    await request(app.getHttpServer()).post('/members/me/loans/7/lost-report').set('x-test-session', '99').send({}).expect(403);
    await request(app.getHttpServer()).post('/members/admin/loans/7/lost').set('x-test-session', '1').send({}).expect(403);
    await request(app.getHttpServer()).post('/members/admin/loans/7/lost/complete').set('x-test-session', '1').send({}).expect(403);
  });
  it('returns 403 for report and detail IDOR without mutating any loan/copy', async () => {
    row.userId = 2;
    await request(app.getHttpServer()).post('/members/me/loans/7/lost-report').set('x-test-session', '1').send({}).expect(403);
    await request(app.getHttpServer()).get('/members/me/loans/7').set('x-test-session', '1').expect(403);
    expect(tx.loan.update).not.toHaveBeenCalled(); expect(tx.bookCopy.updateMany).not.toHaveBeenCalled();
  });
  it.each([{ memberId: 2 }, { userId: 2 }, { lostReportStatus: 'SELESAI' }, { source: 'ADMIN' }, { note: '<script>bad</script>' }])('rejects mass assignment / unsolicited input %j', async body => {
    await request(app.getHttpServer()).post('/members/me/loans/7/lost-report').set('x-test-session', '1').send(body).expect(400);
    expect(tx.loan.update).not.toHaveBeenCalled();
  });
  it('rejects cross-site mutation, invalid IDs and physical-loan mismatch', async () => {
    await request(app.getHttpServer()).post('/members/me/loans/7/lost-report').set('x-test-session', '1').set('Origin', 'http://attacker.test').send({}).expect(403);
    await request(app.getHttpServer()).post('/members/me/loans/2147483648/lost-report').set('x-test-session', '1').send({}).expect(400);
    row.book.type = 'EBOOK';
    await request(app.getHttpServer()).post('/members/me/loans/7/lost-report').set('x-test-session', '1').send({}).expect(409);
  });
  it('own valid report leaves final inventory unchanged and member detail has no private identity/admin fields', async () => {
    const report = await request(app.getHttpServer()).post('/members/me/loans/7/lost-report').set('x-test-session', '1').send({}).expect(201);
    expect(report.body.loan.lostReport.status).toBe('MENUNGGU_VERIFIKASI');
    const detail = await request(app.getHttpServer()).get('/members/me/loans/7').set('x-test-session', '1').expect(200);
    expect(detail.body.loan).not.toHaveProperty('userId'); expect(detail.body.loan).not.toHaveProperty('passwordHash');
    expect(tx.bookCopy.updateMany).not.toHaveBeenCalled(); expect(row.status).toBe('AKTIF'); expect(row.copy.status).toBe('DIPINJAM');
  });
});
