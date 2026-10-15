import { AdminEBooksService } from './admin-ebooks.service';

describe('AdminEBooksService circulation monitoring', () => {
  function harness() {
    const prisma = {
      eBookLoan: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      eBookQueue: {
        count: jest.fn(),
        findMany: jest.fn(),
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
});
