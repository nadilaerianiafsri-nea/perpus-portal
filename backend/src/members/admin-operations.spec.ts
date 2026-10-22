import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { AdminOperationsService } from './admin-operations.service';
import {
  normalizeIndonesianPhone,
  parseLibrarySettingsInput,
  parseReportRange,
} from './admin-operations.validation';
import { PrismaService } from '../prisma/prisma.service';

describe('admin operations validation', () => {
  it.each([
    ['08116904422', '+628116904422'],
    ['628116904422', '+628116904422'],
    ['+628116904422', '+628116904422'],
    ['0811-6904-422', '+628116904422'],
    ['(+62) 811 6904 422', '+628116904422'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizeIndonesianPhone(input)).toBe(expected);
  });

  it.each(['12345', '+6212345678', '+628123456', '+62812345678901234', 'abc'])(
    'rejects invalid phone %s',
    (value) => {
      expect(() => normalizeIndonesianPhone(value)).toThrow(BadRequestException);
    },
  );

  it('validates settings bounds and max extension semantics', () => {
    const base = {
      libraryName: 'Perpustakaan Kementerian Hukum Riau',
      address: 'Jl. Jend. Sudirman No.233, Pekanbaru',
      serviceHours: '08.00–15.00',
      phoneE164: '08116904422',
      reservationDurationHours: 24,
      loanDurationDays: 7,
      extensionDurationDays: 7,
      maxExtensions: null,
    };
    expect(parseLibrarySettingsInput(base).phoneE164).toBe('+628116904422');
    expect(parseLibrarySettingsInput({ ...base, maxExtensions: 0 }).maxExtensions).toBe(0);
    expect(parseLibrarySettingsInput({ ...base, maxExtensions: 100 }).maxExtensions).toBe(100);
    expect(() => parseLibrarySettingsInput({ ...base, maxExtensions: 101 })).toThrow(
      BadRequestException,
    );
    expect(() => parseLibrarySettingsInput({ ...base, libraryName: '<p>test</p>' })).toThrow(
      BadRequestException,
    );
  });

  it('validates report date ordering and maximum range', () => {
    expect(parseReportRange('2026-01-01', '2026-12-31')).toMatchObject({
      from: '2026-01-01',
      to: '2026-12-31',
    });
    expect(() => parseReportRange('2026-02-01', '2026-01-01')).toThrow(
      BadRequestException,
    );
    expect(() => parseReportRange('2026-01-01', '2027-01-03')).toThrow(
      BadRequestException,
    );
    expect(() => parseReportRange('01-01-2026', '2026-01-02')).toThrow(
      BadRequestException,
    );
  });
});

describe('AdminOperationsService', () => {
  function serviceWith(overrides: Record<string, unknown> = {}) {
    // Each query projects different fields; keep the fixture return type open.
    const emptyRows = async (): Promise<unknown[]> => [];
    const prisma = {
      $queryRaw: jest.fn(emptyRows),
      $executeRaw: jest.fn(async () => 1),
      notification: {
        findMany: jest.fn(emptyRows),
        findFirst: jest.fn(async (): Promise<Record<string, unknown> | null> => null),
        count: jest.fn(async () => 0),
      },
      adminNotificationRead: {
        findMany: jest.fn(emptyRows),
        upsert: jest.fn(async () => ({ readAt: new Date('2026-10-14T01:00:00.000Z') })),
      },
      loan: {
        findMany: jest.fn(emptyRows),
        count: jest.fn(async () => 0),
        groupBy: jest.fn(emptyRows),
      },
      reservation: {
        findMany: jest.fn(emptyRows),
        count: jest.fn(async () => 0),
      },
      userEBook: { findMany: jest.fn(emptyRows) },
      bookGrant: { findMany: jest.fn(emptyRows) },
      book: { count: jest.fn(async () => 0), findMany: jest.fn(emptyRows) },
      bookCopy: { count: jest.fn(async () => 0) },
      user: { count: jest.fn(async () => 0) },
      ...overrides,
    };
    return {
      prisma,
      service: new AdminOperationsService(prisma as unknown as PrismaService),
    };
  }

  it('returns defaults when the settings table is unavailable', async () => {
    const { service, prisma } = serviceWith();
    prisma.$queryRaw.mockRejectedValueOnce(new Error('table missing'));
    await expect(service.getSettings()).resolves.toMatchObject({
      reservationDurationHours: 24,
      loanDurationDays: 7,
      extensionDurationDays: 7,
      maxExtensions: null,
      phoneE164: '+628116904422',
    });
  });

  it('does not expose database details when settings cannot be saved', async () => {
    const { service, prisma } = serviceWith();
    prisma.$executeRaw.mockRejectedValueOnce(new Error('SQL secret details'));
    await expect(
      service.updateSettings({
        libraryName: 'Perpustakaan Kementerian Hukum Riau',
        address: 'Jl. Jend. Sudirman No.233, Pekanbaru',
        serviceHours: '08.00–15.00',
        phoneE164: '+628116904422',
        reservationDurationHours: 24,
        loanDurationDays: 7,
        extensionDurationDays: 7,
        maxExtensions: null,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('projects one notification into separate Email and WhatsApp rows', async () => {
    const createdAt = new Date('2026-10-12T01:00:00.000Z');
    const { service, prisma } = serviceWith();
    prisma.notification.findMany.mockResolvedValueOnce([
      {
        id: 7,
        eventKey: 'loan:15:due:1790000000000:-1',
        title: 'Jatuh tempo besok',
        message: 'Pengingat',
        createdAt,
        emailDelivery: 'SENT',
        emailAttemptedAt: createdAt,
        emailSentAt: createdAt,
        whatsappDelivery: 'MANUAL',
        user: {
          name: 'Anggota Uji',
          email: 'anggota@example.com',
          memberProfile: { whatsapp: '081234567890' },
        },
      },
    ]);

    const result = await service.notifications(99, { channel: 'ALL', page: '1', limit: '10' });
    expect(result.counts).toEqual({ all: 2, email: 1, whatsapp: 1, failed: 0, unread: 0 });
    expect(result.data.map((row) => row.channel)).toEqual(['EMAIL', 'WHATSAPP']);
    expect(result.data[0].transactionCode).toBe('TRX-00015');
    expect(result.data[0].reminderType).toBe('H-1 Jatuh Tempo');
  });

  it('projects a new reservation as a System notification with its book title', async () => {
    const createdAt = new Date('2026-10-13T01:00:00.000Z');
    const { service, prisma } = serviceWith();
    prisma.notification.findMany.mockResolvedValueOnce([
      {
        id: 8,
        eventKey: 'reservation:23:created',
        title: 'Reservasi berhasil dibuat',
        message: 'Laskar Pelangi telah direservasi.',
        createdAt,
        emailDelivery: 'NOT_REQUIRED',
        emailAttemptedAt: null,
        emailSentAt: null,
        whatsappDelivery: 'NOT_REQUIRED',
        user: {
          name: 'Anggota Uji',
          email: 'anggota@example.com',
          memberProfile: { whatsapp: '081234567890' },
        },
      },
    ]);
    prisma.reservation.findMany.mockResolvedValueOnce([
      {
        id: 23,
        book: { title: 'Laskar Pelangi' },
      },
    ]);

    const result = await service.notifications(99, { channel: 'ALL', page: '1', limit: '10' });

    expect(result.counts).toEqual({ all: 1, email: 0, whatsapp: 0, failed: 0, unread: 1 });
    expect(result.data[0]).toMatchObject({
      channel: 'SYSTEM',
      transactionCode: 'RSV-00023',
      reminderType: 'Reservasi Baru',
      bookTitle: 'Laskar Pelangi',
      status: 'MENUNGGU',
      readAt: null,
      href: '/admin/transaksi/reservasi',
    });
  });

  it('keeps System notification read state separate for each admin account', async () => {
    const createdAt = new Date('2026-10-13T01:00:00.000Z');
    const readAt = new Date('2026-10-14T01:00:00.000Z');
    const { service, prisma } = serviceWith();
    prisma.notification.findMany.mockResolvedValueOnce([
      {
        id: 8,
        eventKey: 'reservation:23:created',
        title: 'Reservasi berhasil dibuat',
        message: 'Laskar Pelangi telah direservasi.',
        createdAt,
        emailDelivery: 'NOT_REQUIRED',
        emailAttemptedAt: null,
        emailSentAt: null,
        whatsappDelivery: 'NOT_REQUIRED',
        user: {
          name: 'Anggota Uji',
          email: 'anggota@example.com',
          memberProfile: { whatsapp: '081234567890' },
        },
      },
    ]);
    prisma.reservation.findMany.mockResolvedValueOnce([
      { id: 23, book: { title: 'Laskar Pelangi' } },
    ]);
    prisma.adminNotificationRead.findMany.mockResolvedValueOnce([
      { notificationId: 8, readAt },
    ]);

    const result = await service.notifications(99, {
      channel: 'ALL',
      page: '1',
      limit: '10',
    });

    expect(prisma.adminNotificationRead.findMany).toHaveBeenCalledWith({
      where: { adminId: 99, notificationId: { in: [8] } },
      select: { notificationId: true, readAt: true },
    });
    expect(result.counts.unread).toBe(0);
    expect(result.data[0].readAt).toEqual(readAt);
  });

  it('returns the unread System notification count for one admin', async () => {
    const { service, prisma } = serviceWith();
    prisma.notification.count.mockResolvedValueOnce(4);

    await expect(service.unreadNotificationCount(77)).resolves.toEqual({ unread: 4 });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: {
        OR: [{ eventKey: { startsWith: 'reservation:', endsWith: ':created' } }, { eventKey: { startsWith: 'loan:', endsWith: ':lost-report' } }],
        adminReads: { none: { adminId: 77 } },
      },
    });
  });

  it('marks an actionable System notification read for the current admin only', async () => {
    const readAt = new Date('2026-10-14T01:00:00.000Z');
    const { service, prisma } = serviceWith();
    prisma.notification.findFirst.mockResolvedValueOnce({ id: 8 });
    prisma.adminNotificationRead.upsert.mockResolvedValueOnce({ readAt });

    await expect(service.markNotificationRead(77, 8)).resolves.toEqual({ readAt });
    expect(prisma.adminNotificationRead.upsert).toHaveBeenCalledWith({
      where: { adminId_notificationId: { adminId: 77, notificationId: 8 } },
      update: {},
      create: { adminId: 77, notificationId: 8 },
      select: { readAt: true },
    });
  });

  it('rejects marking a non-System notification as read', async () => {
    const { service } = serviceWith();
    await expect(service.markNotificationRead(77, 999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns the database top five real physical collections in ranked order with one title query', async () => {
    const { service, prisma } = serviceWith();
    const ranks = [
      { bookId: 6, _count: { id: 24 } },
      { bookId: 2, _count: { id: 17 } },
      { bookId: 9, _count: { id: 17 } },
      { bookId: 4, _count: { id: 8 } },
      { bookId: 1, _count: { id: 3 } },
    ];
    prisma.loan.groupBy.mockResolvedValueOnce(ranks);
    // Title lookup order need not match ranking order.
    prisma.book.findMany.mockResolvedValueOnce([
      { id: 1, title: 'Judul Satu' }, { id: 9, title: 'Judul Sembilan' },
      { id: 6, title: 'Judul Enam' }, { id: 4, title: 'Judul Empat' },
      { id: 2, title: 'Judul Dua' },
    ]);

    const dashboard = await service.dashboard({ from: '2026-10-01', to: '2026-10-20' });

    expect(prisma.loan.groupBy).toHaveBeenCalledWith({
      by: ['bookId'],
      where: {
        book: { is: { type: 'FISIK', isDemo: false } },
        reservation: { is: { status: 'DIAMBIL' } },
      },
      _count: { id: true },
      orderBy: [{ _count: { id: 'desc' } }, { bookId: 'asc' }],
      take: 5,
    });
    expect(prisma.book.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.book.findMany).toHaveBeenCalledWith({
      where: { id: { in: [6, 2, 9, 4, 1] } }, select: { id: true, title: true },
    });
    expect(dashboard.topBorrowedCollections).toEqual([
      { id: 6, title: 'Judul Enam', borrowCount: 24 },
      { id: 2, title: 'Judul Dua', borrowCount: 17 },
      { id: 9, title: 'Judul Sembilan', borrowCount: 17 },
      { id: 4, title: 'Judul Empat', borrowCount: 8 },
      { id: 1, title: 'Judul Satu', borrowCount: 3 },
    ]);
  });

  it('returns empty supplementary data without a title query when there is no loan history', async () => {
    const { service, prisma } = serviceWith();
    const dashboard = await service.dashboard({ from: '2026-10-01', to: '2026-10-20' });
    expect(dashboard.topBorrowedCollections).toEqual([]);
    expect(prisma.book.findMany).not.toHaveBeenCalled();
    expect(dashboard.actionRequired).toEqual({
      expiringReservations: 0, overdueLoans: 0,
      pendingLostBookReplacements: 0, failedNotifications: 0,
    });
  });

  it('uses the existing two-hour window, scoped nonreturned overdue/lost loans, and reliable email failures', async () => {
    const { service, prisma } = serviceWith();
    prisma.reservation.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
    prisma.loan.count.mockResolvedValueOnce(20).mockResolvedValueOnce(4)
      .mockResolvedValueOnce(12).mockResolvedValueOnce(9)
      .mockResolvedValueOnce(7).mockResolvedValueOnce(2);
    prisma.notification.count.mockResolvedValueOnce(5);
    const before = Date.now();
    const dashboard = await service.dashboard({ from: '2020-01-01', to: '2020-01-02' });
    const after = Date.now();
    expect(dashboard.actionRequired).toEqual({
      expiringReservations: 3, overdueLoans: 7,
      pendingLostBookReplacements: 2, failedNotifications: 5,
    });
    const expiryQuery = (prisma.reservation.count.mock.calls as unknown[][])[1][0] as {
      where: { status: string; user: { is: { role: string } }; expiresAt: { gt: Date; lte: Date } };
    };
    expect(expiryQuery.where.status).toBe('MENUNGGU_PENGAMBILAN');
    expect(expiryQuery.where.user).toEqual({ is: { role: 'PENGUNJUNG' } });
    expect(expiryQuery.where.expiresAt.gt.getTime()).toBeGreaterThanOrEqual(before);
    expect(expiryQuery.where.expiresAt.gt.getTime()).toBeLessThanOrEqual(after);
    expect(expiryQuery.where.expiresAt.lte.getTime() - expiryQuery.where.expiresAt.gt.getTime())
      .toBe(2 * 60 * 60 * 1000);
    expect(prisma.loan.count).toHaveBeenNthCalledWith(5, {
      where: {
        status: 'AKTIF', returnedAt: null, dueAt: { lt: expiryQuery.where.expiresAt.gt },
        book: { is: { type: 'FISIK' } }, user: { is: { role: 'PENGUNJUNG' } },
      },
    });
    expect(prisma.loan.count).toHaveBeenNthCalledWith(6, {
      where: {
        status: 'HILANG', returnedAt: null,
        lostResolvedAt: null,
        book: { is: { type: 'FISIK' } }, user: { is: { role: 'PENGUNJUNG' } },
      },
    });
    expect(dashboard.stats.overdue).toBe(12);
    expect(dashboard.stats.lostInProcess).toBe(9);
    expect(prisma.notification.count).toHaveBeenCalledWith({ where: { emailDelivery: 'FAILED' } });
  });

  it.each(['aggregation', 'titles'] as const)('keeps the dashboard and action section usable when top collection %s fails', async (failure) => {
    const { service, prisma } = serviceWith();
    if (failure === 'aggregation') prisma.loan.groupBy.mockRejectedValueOnce(new Error('database unavailable'));
    else {
      prisma.loan.groupBy.mockResolvedValueOnce([{ bookId: 1, _count: { id: 2 } }]);
      prisma.book.findMany.mockRejectedValueOnce(new Error('database unavailable'));
    }
    const dashboard = await service.dashboard({ from: '2026-10-01', to: '2026-10-20' });
    expect(dashboard.topBorrowedCollections).toBeNull();
    expect(dashboard.actionRequired).not.toBeNull();
    expect(dashboard.stats.totalCollections).toBe(0);
    expect(dashboard.trend.length).toBeGreaterThan(0);
  });

  it.each(['reservation', 'notification', 'overdue', 'lost'] as const)('keeps the dashboard and top collections usable when action %s count fails', async (failure) => {
    const { service, prisma } = serviceWith();
    if (failure === 'reservation') {
      prisma.reservation.count.mockResolvedValueOnce(0).mockRejectedValueOnce(new Error('database unavailable'));
    } else if (failure === 'notification') prisma.notification.count.mockRejectedValueOnce(new Error('database unavailable'));
    else {
      for (let i = 0; i < (failure === 'lost' ? 5 : 4); i++) prisma.loan.count.mockResolvedValueOnce(0);
      prisma.loan.count.mockRejectedValueOnce(new Error('database unavailable'));
    }
    const dashboard = await service.dashboard({ from: '2026-10-01', to: '2026-10-20' });
    expect(dashboard.actionRequired).toBeNull();
    expect(dashboard.topBorrowedCollections).toEqual([]);
    expect(dashboard.stats.totalCollections).toBe(0);
    expect(dashboard.trend.length).toBeGreaterThan(0);
  });

  it('builds realtime dashboard totals and filtered month trend from database activity', async () => {
    const { service, prisma } = serviceWith();

    prisma.book.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(8);
    prisma.bookCopy.count
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(21);
    prisma.reservation.count.mockResolvedValueOnce(3);
    prisma.loan.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);
    prisma.user.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);
    prisma.loan.findMany
      .mockResolvedValueOnce([
        {
          borrowedAt: new Date('2026-04-10T01:00:00.000Z'),
        },
        {
          borrowedAt: new Date('2026-06-10T01:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          returnedAt: new Date('2026-05-01T01:00:00.000Z'),
        },
      ]);

    const dashboard = await service.dashboard({
      from: '2026-04-01',
      to: '2026-06-30',
    });

    expect(dashboard.stats).toEqual({
      totalCollections: 12,
      totalStock: 30,
      availableStock: 21,
      waitingPickup: 3,
      activeLoans: 5,
      dueToday: 2,
      overdue: 1,
      lostInProcess: 1,
      totalMembers: 10,
      ebooks: 8,
    });
    expect(dashboard.memberCategories).toEqual({
      umum: 6,
      mahasiswa: 3,
      pegawai: 1,
    });
    expect(dashboard.trend.map((row) => row.key)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
    ]);
    expect(dashboard.trend.map((row) => [row.borrowings, row.returns])).toEqual([
      [1, 0],
      [0, 1],
      [1, 0],
    ]);
    expect(dashboard.generatedAt).toEqual(expect.any(String));
  });

  it('builds report totals and continuous month buckets from real activity', async () => {
    const { service, prisma } = serviceWith();
    prisma.loan.findMany
      .mockResolvedValueOnce([
        {
          id: 1,
          userId: 2,
          borrowedAt: new Date('2026-04-10T01:00:00.000Z'),
          bookId: 9,
          book: { title: 'Buku Populer' },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 1,
          userId: 2,
          returnedAt: new Date('2026-05-01T01:00:00.000Z'),
        },
      ])
      .mockResolvedValueOnce([
        {
          dueAt: new Date('2026-04-30T01:00:00.000Z'),
          returnedAt: new Date('2026-05-01T01:00:00.000Z'),
          status: 'DIKEMBALIKAN',
        },
      ]);
    prisma.reservation.count.mockResolvedValueOnce(1);
    prisma.reservation.findMany.mockResolvedValueOnce([{ userId: 3 }]);
    prisma.userEBook.findMany.mockResolvedValueOnce([{ userId: 4 }]);
    prisma.bookGrant.findMany.mockResolvedValueOnce([{ items: [{ quantity: 5 }] }]);
    prisma.notification.findMany.mockResolvedValueOnce([{ eventKey: 'loan:1:lost' }]);

    const report = await service.reports({ from: '2026-04-01', to: '2026-06-30' });
    expect(report.stats).toMatchObject({
      borrowings: 1,
      returns: 1,
      expiredReservations: 1,
      overdue: 1,
      popularBook: 'Buku Populer',
      activeMembers: 3,
      grantsReceived: 5,
      lostBooks: 1,
    });
    expect(report.trend.map((row) => row.key)).toEqual(['2026-04', '2026-05', '2026-06']);
  });

  it.each(['dashboard', 'reports'] as const)('%s defaults this month to continuous daily WIB buckets', async (endpoint) => {
    const { service, prisma } = serviceWith();
    prisma.loan.findMany
      .mockResolvedValueOnce([
        { id: 1, userId: 2, borrowedAt: new Date('2026-09-30T17:30:00Z'), bookId: 9, book: { title: 'Buku' } },
        { id: 2, userId: 2, borrowedAt: new Date('2026-10-19T17:30:00Z'), bookId: 9, book: { title: 'Buku' } },
      ])
      .mockResolvedValueOnce([{ id: 1, userId: 2, returnedAt: new Date('2026-10-02T01:00:00Z') }]);
    const result = await service[endpoint]({ from: '2026-10-01', to: '2026-10-20' });
    expect(result).toMatchObject({ granularity: 'day' });
    expect(result.trend).toHaveLength(20);
    expect(result.trend[0]).toMatchObject({ key: '2026-10-01', label: '1 Okt', tooltipLabel: '1 Okt 2026', borrowings: 1, returns: 0 });
    expect(result.trend[1]).toMatchObject({ key: '2026-10-02', borrowings: 0, returns: 1 });
    expect(result.trend[2]).toMatchObject({ key: '2026-10-03', borrowings: 0, returns: 0 });
    expect(result.trend[19]).toMatchObject({ key: '2026-10-20', borrowings: 1, returns: 0 });
    expect(prisma.loan.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { borrowedAt: { gte: new Date('2026-09-30T17:00:00Z'), lt: new Date('2026-10-20T17:00:00Z') } } }));
  });

  it.each(['dashboard', 'reports'] as const)('%s supports explicit hourly today buckets and weekly daily defaults', async (endpoint) => {
    const { service } = serviceWith();
    const today = await service[endpoint]({ from: '2026-10-20', to: '2026-10-20', granularity: 'hour' });
    expect(today).toMatchObject({ granularity: 'hour' });
    expect(today.trend).toHaveLength(24);
    expect(today.trend[0]).toMatchObject({ key: '2026-10-20T00', borrowings: 0, returns: 0 });
    expect(today.trend[23].key).toBe('2026-10-20T23');
    const week = await service[endpoint]({ from: '2026-10-19', to: '2026-10-20' });
    expect(week).toMatchObject({ granularity: 'day' });
    expect(week.trend).toHaveLength(2);
  });

  it.each(['dashboard', 'reports'] as const)('%s keeps year ranges monthly with 12 buckets', async (endpoint) => {
    const { service } = serviceWith();
    const result = await service[endpoint]({ from: '2026-01-01', to: '2026-12-31' });
    expect(result).toMatchObject({ granularity: 'month' });
    expect(result.trend).toHaveLength(12);
    expect(result.trend[0].key).toBe('2026-01');
    expect(result.trend[11].key).toBe('2026-12');
  });

  it.each(['dashboard', 'reports'] as const)('%s rejects invalid or overly dense granularity before querying', async (endpoint) => {
    const { service, prisma } = serviceWith();
    for (const granularity of ['invalid', ['hour'], {}, '', null]) {
      await expect(service[endpoint]({ from: '2026-10-20', to: '2026-10-20', granularity })).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(service[endpoint]({ from: '2026-10-01', to: '2026-10-20', granularity: 'hour' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service[endpoint]({ from: '2026-01-01', to: '2026-12-31', granularity: 'day' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service[endpoint]({ from: '2025-01-01', to: '2026-12-31', granularity: 'year' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.loan.findMany).not.toHaveBeenCalled();
    expect(prisma.book.count).not.toHaveBeenCalled();
  });
});
