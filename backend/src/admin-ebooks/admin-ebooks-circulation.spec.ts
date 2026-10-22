import { AdminEBooksService } from './admin-ebooks.service';
import { AdminEBooksController } from './admin-ebooks.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminRoleGuard } from '../admin-books/admin-role.guard';
import { RequestMethod } from '@nestjs/common';
import { GUARDS_METADATA, METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

describe('AdminEBooksService circulation monitoring', () => {
  function harness() {
    const prisma = {
      eBookLoan: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      eBookQueue: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    return {
      prisma,
      service: new AdminEBooksService(prisma as never),
    };
  }

  it('returns active loans, active queue and completed loan history without mutation actions', async () => {
    const { prisma, service } = harness();
    prisma.eBookLoan.count.mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    prisma.eBookQueue.count.mockResolvedValueOnce(1);
    prisma.eBookLoan.findMany
      .mockResolvedValueOnce([
        {
          id: 10,
          status: 'AKTIF',
          borrowedAt: new Date('2026-10-14T00:00:00.000Z'),
          dueAt: new Date('2026-10-21T00:00:00.000Z'),
          endedAt: null,
          user: { id: 1, name: 'Tary', email: 'tary@example.test' },
          book: { id: 7, title: 'Bumi', code: 'EB-007', coverUrl: '/cover.jpg' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 8,
          status: 'DIKEMBALIKAN',
          borrowedAt: new Date('2026-10-01T00:00:00.000Z'),
          dueAt: new Date('2026-10-08T00:00:00.000Z'),
          endedAt: new Date('2026-10-05T00:00:00.000Z'),
          user: { id: 1, name: 'Tary', email: 'tary@example.test' },
          book: { id: 7, title: 'Bumi', code: 'EB-007', coverUrl: '/cover.jpg' },
        },
        {
          id: 9,
          status: 'KEDALUWARSA',
          borrowedAt: new Date('2026-09-20T00:00:00.000Z'),
          dueAt: new Date('2026-09-27T00:00:00.000Z'),
          endedAt: new Date('2026-09-27T00:00:00.000Z'),
          user: { id: 2, name: 'Nadia', email: 'nadia@example.test' },
          book: { id: 8, title: 'Laut', code: 'EB-008', coverUrl: '/cover2.jpg' },
        },
      ]);
    prisma.eBookQueue.findMany
      .mockResolvedValueOnce([
        {
          id: 20,
          status: 'DITAWARKAN',
          queuedAt: new Date('2026-10-13T00:00:00.000Z'),
          offeredAt: new Date('2026-10-14T01:00:00.000Z'),
          claimExpiresAt: new Date('2026-10-15T01:00:00.000Z'),
          user: { id: 3, name: 'Rani', email: 'rani@example.test' },
          book: { id: 9, title: 'Awan', code: 'EB-009', coverUrl: '/cover3.jpg' },
          bookId: 9,
        },
      ])
      .mockResolvedValueOnce([{ id: 20, bookId: 9 }]);

    const result = await service.circulation({});

    expect(result.activeLoans.data[0]).toMatchObject({ id: 10, status: 'AKTIF' });
    expect(result.queues.data[0]).toMatchObject({ id: 20, position: 1, status: 'DITAWARKAN' });
    expect(result.history.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 8, status: 'DIKEMBALIKAN', endedAt: expect.any(Date) }),
        expect.objectContaining({ id: 9, status: 'KEDALUWARSA', endedAt: expect.any(Date) }),
      ]),
    );
  });

  it('rejects unknown query fields', async () => {
    const { service } = harness();
    await expect(service.circulation({ mutate: 'true' })).rejects.toThrow(
      'Parameter tidak diizinkan.',
    );
  });

  it('selects read-only loan detail by its own ID, including member type and no technical credentials', async () => {
    const { prisma, service } = harness();
    prisma.eBookLoan.findUnique.mockResolvedValue({ id: 7, status: 'DIKEMBALIKAN' });
    const detail = await service.circulationDetail('loan', '7');
    expect(detail).toEqual({ kind: 'loan', record: { id: 7, status: 'DIKEMBALIKAN' } });
    expect(prisma.eBookLoan.findUnique).toHaveBeenCalledWith({
      where: { id: 7 },
      select: {
        id: true, status: true,
        borrowedAt: true, dueAt: true, endedAt: true,
        user: { select: { id: true, name: true, email: true, memberType: true } },
        book: { select: { id: true, title: true, code: true, coverUrl: true, author: true, licenseNote: true } },
      },
    });
    expect(prisma.eBookQueue.findUnique).not.toHaveBeenCalled();
  });

  it('queue detail uses a separate entity ID and calculates position across all active entries with timestamp/id ordering', async () => {
    const { prisma, service } = harness();
    const queuedAt = new Date('2026-10-20T03:00:00Z');
    prisma.eBookQueue.findUnique.mockResolvedValue({ id: 7, bookId: 2, status: 'MENUNGGU', queuedAt, user: {}, book: {} });
    prisma.eBookQueue.count.mockResolvedValue(4);
    const detail = await service.circulationDetail('queue', '7');
    expect(detail.record).toHaveProperty('position', 5);
    expect(detail.record).not.toHaveProperty('bookId');
    expect(prisma.eBookQueue.count).toHaveBeenCalledWith({ where: {
      bookId: 2, status: { in: ['MENUNGGU', 'DITAWARKAN'] },
      OR: [{ queuedAt: { lt: queuedAt } }, { queuedAt, id: { lt: 7 } }],
    } });
    expect(prisma.eBookLoan.findUnique).not.toHaveBeenCalled();
  });

  it('closed queue detail has no fabricated active position and missing/invalid records fail safely', async () => {
    const { prisma, service } = harness();
    prisma.eBookQueue.findUnique.mockResolvedValue({ id: 7, bookId: 2, status: 'DIBATALKAN' });
    expect((await service.circulationDetail('queue', '7')).record).toHaveProperty('position', null);
    expect(prisma.eBookQueue.count).not.toHaveBeenCalled();
    prisma.eBookLoan.findUnique.mockResolvedValue(null);
    await expect(service.circulationDetail('loan', '7')).rejects.toThrow('Akses E-Book tidak ditemukan.');
    prisma.eBookQueue.findUnique.mockResolvedValue(null);
    await expect(service.circulationDetail('queue', '7')).rejects.toThrow('Antrean E-Book tidak ditemukan.');
    for (const id of ['0', '-1', '1.5', '2147483648', 'abc']) {
      await expect(service.circulationDetail('loan', id)).rejects.toThrow();
    }
    expect(prisma.eBookLoan.findUnique).toHaveBeenCalledTimes(1);
  });

  it('both detail routes remain GET-only under the existing authentication and admin role guards', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminEBooksController)).toEqual([JwtAuthGuard, AdminRoleGuard]);
    for (const [name, path] of [
      ['circulationLoanDetail', 'circulation/loans/:id'],
      ['circulationQueueDetail', 'circulation/queues/:id'],
    ] as const) {
      const method = Object.getOwnPropertyDescriptor(AdminEBooksController.prototype, name)?.value as object;
      expect(Reflect.getMetadata(METHOD_METADATA, method)).toBe(RequestMethod.GET);
      expect(Reflect.getMetadata(PATH_METADATA, method)).toBe(path);
    }
  });
});
