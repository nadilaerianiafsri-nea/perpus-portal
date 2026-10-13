import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
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
    const prisma = {
      $queryRaw: jest.fn(async () => []),
      $executeRaw: jest.fn(async () => 1),
      notification: { findMany: jest.fn(async () => []) },
      loan: {
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
      },
      reservation: {
        findMany: jest.fn(async () => []),
        count: jest.fn(async () => 0),
      },
      userEBook: { findMany: jest.fn(async () => []) },
      bookGrant: { findMany: jest.fn(async () => []) },
      book: { count: jest.fn(async () => 0) },
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

    const result = await service.notifications({ channel: 'ALL', page: '1', limit: '10' });
    expect(result.counts).toEqual({ all: 2, email: 1, whatsapp: 1, failed: 0 });
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

    const result = await service.notifications({ channel: 'ALL', page: '1', limit: '10' });

    expect(result.counts).toEqual({ all: 1, email: 0, whatsapp: 0, failed: 0 });
    expect(result.data[0]).toMatchObject({
      channel: 'SYSTEM',
      transactionCode: 'RSV-00023',
      reminderType: 'Reservasi Baru',
      bookTitle: 'Laskar Pelangi',
      status: 'MENUNGGU',
    });
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
});
