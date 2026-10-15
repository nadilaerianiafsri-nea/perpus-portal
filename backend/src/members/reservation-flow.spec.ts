import { ConflictException } from '@nestjs/common';
import { MembersService } from './members.service';

function harness({ duplicate = false, stock = true, allocated = true } = {}) {
  const locks: string[] = [];
  const book = { id: 9, title: 'Hukum', type: 'FISIK' };
  const tx = {
    $queryRaw: jest.fn(async (sql: TemplateStringsArray) => {
      const text = sql.join('?');
      locks.push(text);
      return text.includes('book_copies') && stock ? [{ id: 18 }] : [];
    }),
    memberProfile: {
      findUnique: jest.fn().mockResolvedValue({ whatsapp: '081234567890' }),
    },
    book: { findUnique: jest.fn().mockResolvedValue(book) },
    reservation: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(duplicate ? { id: 4 } : null),
      create: jest.fn(async ({ data }) => ({
        id: 4,
        status: 'MENUNGGU_PENGAMBILAN',
        ...data,
        book,
        copy: { id: 18, code: 'COPY-18', status: 'DIRESERVASI' },
      })),
    },
    bookCopy: {
      updateMany: jest.fn().mockResolvedValue({ count: allocated ? 1 : 0 }),
    },
    loan: { create: jest.fn() },
    notification: { createMany: jest.fn() },
  };
  const prisma = { ...tx, $transaction: jest.fn((work) => work(tx)) };
  return {
    service: new MembersService(prisma as never, {} as never),
    tx,
    locks,
  };
}

describe('existing physical reservation flow', () => {
  it('creates a 24-hour reservation for the current member, locks a copy and does not create a loan', async () => {
    const { service, tx, locks } = harness();
    const result = await service.reserve(7, { bookId: 9 });
    expect(
      result.reservation.expiresAt.getTime() -
        result.reservation.createdAt.getTime(),
    ).toBe(86400000);
    expect(tx.reservation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 7, bookId: 9, copyId: 18 }),
      }),
    );
    expect(locks).toEqual(
      expect.arrayContaining([
        expect.stringContaining('users WHERE id = ? FOR UPDATE'),
        expect.stringContaining('books WHERE id = ? FOR UPDATE'),
        expect.stringContaining(
          "status = 'TERSEDIA' ORDER BY id LIMIT 1 FOR UPDATE",
        ),
      ]),
    );
    expect(tx.bookCopy.updateMany).toHaveBeenCalledWith({
      where: { id: 18, status: 'TERSEDIA' },
      data: { status: 'DIRESERVASI' },
    });
    expect(tx.loan.create).not.toHaveBeenCalled();
  });
  it.each([{ duplicate: true }, { stock: false }, { allocated: false }])(
    'rejects duplicate or exhausted/raced stock without creating a reservation: %j',
    async (options) => {
      const { service, tx } = harness(options);
      await expect(service.reserve(7, { bookId: 9 })).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(tx.reservation.create).not.toHaveBeenCalled();
      expect(tx.loan.create).not.toHaveBeenCalled();
    },
  );
});
