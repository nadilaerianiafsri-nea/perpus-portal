import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  EBOOK_LOAN_MS,
  EBOOK_OFFER_MS,
  EBookCirculationService,
} from './ebook-circulation.service';

type AnyRecord = Record<string, any>;

function baseBook(id = 10) {
  return {
    id,
    title: `E-Book ${id}`,
    code: `EB-${id}`,
    coverUrl: '/images/placeholder-book.svg',
    author: 'Penulis',
    format: 'PDF',
    type: 'EBOOK',
    isActive: true,
  };
}

function makeHarness(overrides: Partial<AnyRecord> = {}) {
  const createdLoans: AnyRecord[] = [];
  const updatedQueues: AnyRecord[] = [];
  const notifications: AnyRecord[] = [];
  const book = baseBook();
  const tx: AnyRecord = {
    $queryRaw: jest.fn().mockResolvedValue([{ id: book.id }]),
    book: { findUnique: jest.fn().mockResolvedValue(book) },
    eBookLoan: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }: AnyRecord) => {
        const row = { id: 1, ...data, book };
        createdLoans.push(row);
        return row;
      }),
      update: jest.fn(async ({ where, data }: AnyRecord) => ({
        id: where.id,
        ...data,
        book,
      })),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    eBookQueue: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(async ({ data }: AnyRecord) => ({
        id: 1,
        ...data,
        book,
      })),
      update: jest.fn(async ({ where, data }: AnyRecord) => {
        const row = { id: where.id, ...data, book };
        updatedQueues.push(row);
        return row;
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(0),
    },
    notification: {
      createMany: jest.fn(async ({ data }: AnyRecord) => {
        notifications.push(...data);
        return { count: data.length };
      }),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    userEBook: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    ...overrides,
  };
  const prisma: AnyRecord = {
    $transaction: jest.fn((work: (client: AnyRecord) => unknown) => work(tx)),
    eBookLoan: tx.eBookLoan,
    eBookQueue: tx.eBookQueue,
    userEBook: tx.userEBook,
    notification: tx.notification,
  };
  const mail = {
    isConfigured: jest.fn().mockReturnValue(false),
    sendEBookNotification: jest.fn().mockResolvedValue(true),
  };
  return {
    service: new EBookCirculationService(prisma as never, mail as never),
    tx,
    prisma,
    mail,
    createdLoans,
    updatedQueues,
    notifications,
  };
}

describe('EBookCirculationService', () => {
  afterEach(() => jest.useRealTimers());

  it('memberikan masa pinjam tepat tujuh hari', async () => {
    const harness = makeHarness();
    const before = Date.now();

    const result = await harness.service.borrow(7, 10);

    expect(result.loan.dueAt.getTime() - result.loan.borrowedAt.getTime()).toBe(
      EBOOK_LOAN_MS,
    );
    expect(result.loan.borrowedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(harness.createdLoans[0].activeBookId).toBe(10);
  });

  it('menolak anggota lain saat judul masih memiliki peminjam aktif', async () => {
    const harness = makeHarness();
    harness.tx.eBookLoan.findFirst.mockResolvedValue({
      id: 44,
      userId: 99,
      bookId: 10,
      status: 'AKTIF',
      borrowedAt: new Date(),
      dueAt: new Date(Date.now() + EBOOK_LOAN_MS),
      book: baseBook(),
    });

    await expect(harness.service.borrow(7, 10)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('memberi hak klaim antrean selama tepat 24 jam', async () => {
    const harness = makeHarness();
    const waiting = {
      id: 23,
      userId: 8,
      bookId: 10,
      status: 'MENUNGGU',
      queuedAt: new Date(Date.now() - 1000),
      offeredAt: null,
      claimExpiresAt: null,
      activeKey: '8:10',
      book: baseBook(),
    };
    harness.tx.eBookQueue.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(waiting);
    harness.tx.eBookQueue.findMany.mockResolvedValue([]);

    await harness.service.runMaintenanceForBook(10, new Date());

    const promotion = harness.tx.eBookQueue.update.mock.calls
      .map((call: AnyRecord[]) => call[0])
      .find((call: AnyRecord) => call.data?.status === 'DITAWARKAN');
    expect(promotion).toBeDefined();
    expect(
      promotion.data.claimExpiresAt.getTime() -
        promotion.data.offeredAt.getTime(),
    ).toBe(EBOOK_OFFER_MS);
  });

  it('menolak pembukaan reader tanpa pinjaman aktif', async () => {
    const harness = makeHarness();
    await expect(harness.service.open(7, 10)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('opens the current member reading through the existing composite upsert without resetting progress', async () => {
    const harness = makeHarness();
    harness.tx.eBookLoan.findFirst.mockImplementation(
      async ({ where }: AnyRecord) => (where.dueAt?.lte ? null : { id: 44 }),
    );
    const reading = {
      id: 6,
      bookId: 10,
      book: baseBook(),
      progress: 42,
      lastPosition: 0.42,
      progressVersion: 3,
    };
    harness.tx.userEBook.upsert.mockResolvedValue(reading);
    for (let i = 0; i < 2; i++) {
      expect((await harness.service.open(7, 10)).ebook.progress).toBe(42);
    }
    for (const [call] of harness.tx.userEBook.upsert.mock.calls) {
      expect(call.where).toEqual({ userId_bookId: { userId: 7, bookId: 10 } });
      expect(call.update).toEqual({ lastOpenedAt: expect.any(Date) });
    }
    expect(harness.tx.userEBook.update).not.toHaveBeenCalled();
  });

  it('cannot cancel an E-Book queue belonging to another member', async () => {
    const harness = makeHarness();
    await expect(harness.service.cancelQueue(7, 10)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(harness.tx.eBookQueue.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ activeKey: '7:10' }),
      }),
    );
    expect(harness.tx.eBookQueue.update).not.toHaveBeenCalled();
  });

  it('menolak penyimpanan progres setelah akses berakhir', async () => {
    const harness = makeHarness();
    await expect(
      harness.service.updateProgress(7, 10, {
        progress: 40,
        lastPosition: 0.12,
        expectedVersion: 0,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('memakai penanda database activeBookId untuk mencegah dua loan aktif pada judul yang sama', async () => {
    const harness = makeHarness();
    await harness.service.borrow(7, 10);
    expect(harness.createdLoans[0]).toMatchObject({
      bookId: 10,
      activeBookId: 10,
      status: 'AKTIF',
    });
  });
});
