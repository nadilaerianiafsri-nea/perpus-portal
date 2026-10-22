import { createHmac } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { jest } from '@jest/globals';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { PrismaService } from '../prisma/prisma.service';
import { AdminTransactionsController } from './admin-transactions.controller';
import { AdminTransactionsService } from './admin-transactions.service';
import { MemberRoleGuard } from './member-role.guard';
import { MembersService } from './members.service';

describe('admin transaction detail HTTP contract', () => {
  let app: INestApplication;
  const jwt = new JwtService();
  const secret = 'admin-transaction-details-test-secret';
  const user = {
    id: 7,
    name: 'Anggota Uji',
    email: 'anggota@example.com',
    memberType: 'UMUM',
    memberProfile: { whatsapp: '081234567890' },
  };
  const loan = {
    id: 31,
    status: 'AKTIF',
    borrowedAt: new Date('2026-10-01T03:00:00.000Z'),
    dueAt: new Date('2026-10-08T03:00:00.000Z'),
    returnedAt: null as Date | null,
    extensionCount: 2,
    user,
    book: { id: 12, code: 'BK-012', title: 'Buku Fisik', coverUrl: '/cover.jpg', shelf: 'Rak A' as string | null },
    copy: { id: 9, code: 'BK-012-009', location: 'Lantai 2' },
  };
  const access = {
    id: 41,
    addedAt: new Date('2026-09-01T03:00:00.000Z'),
    lastOpenedAt: new Date('2026-09-03T04:00:00.000Z') as Date | null,
    progress: 37,
    user,
    book: { id: 16, code: 'EB-016', title: 'Buku Digital', coverUrl: null, author: 'Penulis Uji', accessDurationDays: 5 as number | null },
  };
  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }: { where: { id: number } }) => ({
        passwordHash: 'test-password-hash',
        role: where.id === 99 ? 'ADMIN' : 'PENGUNJUNG',
        emailVerified: true,
        isActive: true,
      })),
    },
    loan: { findFirst: jest.fn(async (): Promise<typeof loan | null> => loan) },
    userEBook: { findFirst: jest.fn(async (): Promise<typeof access | null> => access) },
    $transaction: jest.fn(),
    $executeRaw: jest.fn(),
  };
  const members = { expireReservations: jest.fn() };
  const paths = ['loans/31', 'ebook-access/41'];
  const url = (path: string) => `/members/admin/transactions/${path}`;

  function session(sub = 99) {
    return `perpus_session=${jwt.sign({
      sub,
      credentialVersion: createHmac('sha256', secret).update('test-password-hash').digest('hex'),
    }, { secret })}`;
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AdminTransactionsController],
      providers: [
        AdminTransactionsService,
        MemberRoleGuard,
        { provide: PrismaService, useValue: prisma },
        { provide: MembersService, useValue: members },
        { provide: JwtService, useValue: jwt },
        { provide: ConfigService, useValue: { getOrThrow: () => secret } },
      ],
    }).compile();
    app = module.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.loan.findFirst.mockResolvedValue(loan);
    prisma.userEBook.findFirst.mockResolvedValue(access);
    loan.status = 'AKTIF';
    loan.returnedAt = null;
    loan.book.shelf = 'Rak A';
    user.memberProfile = { whatsapp: '081234567890' };
    access.book.accessDurationDays = 5;
    access.lastOpenedAt = new Date('2026-09-03T04:00:00.000Z');
  });

  afterEach(() => {
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.$executeRaw).not.toHaveBeenCalled();
    expect(members.expireReservations).not.toHaveBeenCalled();
  });

  afterAll(async () => { await app.close(); });

  it.each(paths)('requires authentication for %s', async (path) => {
    await request(app.getHttpServer()).get(url(path)).expect(401);
    expect(prisma.loan.findFirst).not.toHaveBeenCalled();
    expect(prisma.userEBook.findFirst).not.toHaveBeenCalled();
  });

  it.each(paths)('rejects nonadmin access for %s', async (path) => {
    await request(app.getHttpServer()).get(url(path)).set('Cookie', session(1)).expect(403);
    expect(prisma.loan.findFirst).not.toHaveBeenCalled();
    expect(prisma.userEBook.findFirst).not.toHaveBeenCalled();
  });

  it.each(['loans', 'ebook-access'])('rejects malformed IDs before reading %s', async (resource) => {
    for (const id of ['0', '-1', '1.5', 'abc', '2147483648', '31suffix']) {
      await request(app.getHttpServer()).get(url(`${resource}/${id}`)).set('Cookie', session()).expect(400);
    }
    expect(prisma.loan.findFirst).not.toHaveBeenCalled();
    expect(prisma.userEBook.findFirst).not.toHaveBeenCalled();
  });

  it.each(paths)('rejects unknown query parameters for %s', async (path) => {
    await request(app.getHttpServer()).get(`${url(path)}?userId=7`).set('Cookie', session()).expect(400);
    expect(prisma.loan.findFirst).not.toHaveBeenCalled();
    expect(prisma.userEBook.findFirst).not.toHaveBeenCalled();
  });

  it('returns the physical loan, member and copy details for the exact internal loan ID', async () => {
    const response = await request(app.getHttpServer()).get(url('loans/31')).set('Cookie', session()).expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toEqual({ loan: {
      id: 31, status: 'AKTIF', borrowedAt: '2026-10-01T03:00:00.000Z', dueAt: '2026-10-08T03:00:00.000Z', returnedAt: null, extensionCount: 2,
      member: { id: 7, name: 'Anggota Uji', email: 'anggota@example.com', memberType: 'UMUM', whatsapp: '081234567890' },
      book: { id: 12, code: 'BK-012', title: 'Buku Fisik', coverUrl: '/cover.jpg', shelf: 'Rak A' },
      copy: { id: 9, code: 'BK-012-009', location: 'Lantai 2' },
    } });
    expect(prisma.loan.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 31, book: { is: { type: 'FISIK' } } } }));
    expect(prisma.userEBook.findFirst).not.toHaveBeenCalled();
  });

  it.each(['DIKEMBALIKAN', 'HILANG'])('allows historical physical loan status %s', async (status) => {
    loan.status = status;
    loan.returnedAt = status === 'DIKEMBALIKAN' ? new Date('2026-10-07T03:00:00.000Z') : null;
    loan.book.shelf = null;
    const response = await request(app.getHttpServer()).get(url('loans/31')).set('Cookie', session()).expect(200);
    expect(response.body.loan.status).toBe(status);
    expect(response.body.loan.returnedAt).toBe(status === 'DIKEMBALIKAN' ? '2026-10-07T03:00:00.000Z' : null);
    expect(response.body.loan.book.shelf).toBeNull();
  });

  it('returns 404 for a missing physical loan or a loan of another book type', async () => {
    prisma.loan.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer()).get(url('loans/999')).set('Cookie', session()).expect(404);
    expect(prisma.loan.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 999, book: { is: { type: 'FISIK' } } } }));
  });

  it('uses the UserEBook ID and returns an expired access with the existing duration calculation', async () => {
    const response = await request(app.getHttpServer()).get(url('ebook-access/41')).set('Cookie', session()).expect(200);
    expect(response.headers['cache-control']).toBe('private, no-store');
    expect(response.body).toEqual({ access: {
      id: 41, addedAt: '2026-09-01T03:00:00.000Z', lastOpenedAt: '2026-09-03T04:00:00.000Z', endsAt: '2026-09-06T03:00:00.000Z', progress: 37,
      member: { id: 7, name: 'Anggota Uji', email: 'anggota@example.com', memberType: 'UMUM', whatsapp: '081234567890' },
      book: { id: 16, code: 'EB-016', title: 'Buku Digital', coverUrl: null, author: 'Penulis Uji' },
    } });
    expect(prisma.userEBook.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 41, book: { is: { type: 'EBOOK' } } } }));
    expect(prisma.loan.findFirst).not.toHaveBeenCalled();
  });

  it('returns null end and last-opened dates for unlimited, unopened e-book access', async () => {
    access.book.accessDurationDays = null;
    access.lastOpenedAt = null;
    const response = await request(app.getHttpServer()).get(url('ebook-access/41')).set('Cookie', session()).expect(200);
    expect(response.body.access.endsAt).toBeNull();
    expect(response.body.access.lastOpenedAt).toBeNull();
  });

  it('returns 404 for a missing UserEBook ID or access to another book type', async () => {
    prisma.userEBook.findFirst.mockResolvedValue(null);
    await request(app.getHttpServer()).get(url('ebook-access/999')).set('Cookie', session()).expect(404);
    expect(prisma.userEBook.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 999, book: { is: { type: 'EBOOK' } } } }));
  });
});
