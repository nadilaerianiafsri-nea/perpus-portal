import { ConflictException, type ExecutionContext } from '@nestjs/common';
import { ActiveBookGuard } from './active-book.guard';
import type { PrismaService } from '../prisma/prisma.service';

describe('physical borrowing status keeps its existing conflict rule and identifies the actual active resource', () => {
  it.each([
    ['reservation', 'ACTIVE_RESERVATION'],
    ['loan', 'ACTIVE_LOAN'],
    ['userEBook', 'ACTIVE_EBOOK'],
  ])('identifies %s conflicts', async (resource, code) => {
    const same = {
      book: { id: 8, title: 'Hukum', accessDurationDays: null },
      bookId: 8,
      addedAt: new Date(),
    };
    const findMany = (name: string) => ({
      findMany: jest.fn().mockResolvedValue(name === resource ? [same] : []),
    });
    const prisma = {
      book: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ type: 'FISIK', isActive: true, title: 'Hukum' }),
      },
      reservation: findMany('reservation'),
      loan: { ...findMany('loan'), findFirst: jest.fn().mockResolvedValue(null) },
      userEBook: findMany('userEBook'),
    };
    const guard = new ActiveBookGuard(prisma as unknown as PrismaService);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ params: { bookId: '9' }, user: { sub: 7 } }),
      }),
    } as unknown as ExecutionContext;
    try {
      await guard.canActivate(context);
      throw Error('Expected existing conflict');
    } catch (error) {
      expect(error).toBeInstanceOf(ConflictException);
      expect((error as ConflictException).getResponse()).toEqual(
        expect.objectContaining({ code }),
      );
    }
    expect(prisma[resource as 'reservation'].findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 7 }),
      }),
    );
  });
});

describe('new borrowing is forbidden when an older case remains unresolved', () => {
  it.each([
    [{ status: 'AKTIF', dueAt: new Date('2026-11-01'), lostReportStatus: null }, 'OVERDUE_LOAN'],
    [{ status: 'AKTIF', dueAt: new Date('2026-12-01'), lostReportStatus: 'MENUNGGU_VERIFIKASI' }, 'UNRESOLVED_LOST_BOOK'],
    [{ status: 'HILANG', dueAt: new Date('2026-11-01'), lostReportStatus: 'PROSES_PENGGANTIAN' }, 'UNRESOLVED_LOST_BOOK'],
  ])('rejects a member with %p', async (restricted, code) => {
    const prisma = {
      book: { findUnique: jest.fn().mockResolvedValue({ title: 'Hukum', type: 'FISIK', isActive: true }) },
      loan: { findFirst: jest.fn().mockResolvedValue(restricted), findMany: jest.fn() },
      reservation: { findMany: jest.fn() },
      userEBook: { findMany: jest.fn() },
    };
    const guard = new ActiveBookGuard(prisma as unknown as PrismaService);
    const context = { switchToHttp: () => ({ getRequest: () => ({ params: { bookId: '9' }, user: { sub: 7 } }) }) } as unknown as ExecutionContext;
    await expect(guard.canActivate(context)).rejects.toMatchObject({ response: expect.objectContaining({ code }) });
    expect(prisma.loan.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: 7 }) }));
    expect(prisma.reservation.findMany).not.toHaveBeenCalled();
  });
});
