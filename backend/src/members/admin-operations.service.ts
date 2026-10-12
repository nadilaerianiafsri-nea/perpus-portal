import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { serviceInfo } from '../../../shared/serviceInfo.cjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  type LibrarySettings,
  parseLibrarySettingsInput,
  parseNotificationQuery,
  parseReportRange,
} from './admin-operations.validation';

const DEFAULT_SETTINGS: LibrarySettings = Object.freeze({
  libraryName: 'Perpustakaan Kementerian Hukum Riau',
  address: serviceInfo.address,
  serviceHours: serviceInfo.hours,
  phoneE164: '+628116904422',
  reservationDurationHours: 24,
  loanDurationDays: 7,
  extensionDurationDays: 7,
  maxExtensions: null,
});

type SettingsRow = {
  libraryName: string;
  address: string;
  serviceHours: string;
  phoneE164: string;
  reservationDurationHours: number;
  loanDurationDays: number;
  extensionDurationDays: number;
  maxExtensions: number | null;
};

type AdminNotificationRow = {
  id: string;
  sourceNotificationId: number;
  memberName: string;
  memberEmail: string;
  memberWhatsapp: string;
  transactionCode: string;
  reminderType: string;
  channel: 'EMAIL' | 'WHATSAPP';
  time: Date;
  status: 'TERKIRIM' | 'GAGAL' | 'MENUNGGU' | 'MENGIRIM' | 'MANUAL';
};

function transactionCode(eventKey: string) {
  const match = /^(?:loan|reservation):(\d+):/.exec(eventKey);
  return match ? `TRX-${String(Number(match[1])).padStart(5, '0')}` : '-';
}

function reminderType(eventKey: string, title: string) {
  const loan = /^loan:\d+:due:\d+:(-?\d+)$/.exec(eventKey);
  if (loan) {
    const milestone = Number(loan[1]);
    if (milestone === -1) return 'H-1 Jatuh Tempo';
    if (milestone === 0) return 'Hari Jatuh Tempo';
    return `Terlambat H+${milestone}`;
  }
  if (/^reservation:\d+:almost$/.test(eventKey)) return 'Reservasi';
  return title;
}

function emailStatus(value: string): AdminNotificationRow['status'] {
  switch (value) {
    case 'SENT':
      return 'TERKIRIM';
    case 'FAILED':
      return 'GAGAL';
    case 'SENDING':
      return 'MENGIRIM';
    default:
      return 'MENUNGGU';
  }
}

function whatsappStatus(value: string): AdminNotificationRow['status'] {
  switch (value) {
    case 'SENT':
      return 'TERKIRIM';
    case 'FAILED':
      return 'GAGAL';
    default:
      return 'MANUAL';
  }
}

function monthKeyFromDate(value: Date) {
  const shifted = new Date(value.getTime() + 7 * 60 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}`;
}

function monthKeys(from: string, to: string) {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  const rows: string[] = [];
  let year = fromYear;
  let month = fromMonth;
  while (year < toYear || (year === toYear && month <= toMonth)) {
    rows.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return rows;
}

function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

@Injectable()
export class AdminOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  defaults(): LibrarySettings {
    return { ...DEFAULT_SETTINGS };
  }

  async getSettings(): Promise<LibrarySettings> {
    try {
      const rows = await this.prisma.$queryRaw<SettingsRow[]>`
        SELECT
          libraryName,
          address,
          serviceHours,
          phoneE164,
          reservationDurationHours,
          loanDurationDays,
          extensionDurationDays,
          maxExtensions
        FROM library_settings
        WHERE id = 1
        LIMIT 1
      `;
      const row = rows[0];
      return row
        ? {
            libraryName: row.libraryName,
            address: row.address,
            serviceHours: row.serviceHours,
            phoneE164: row.phoneE164,
            reservationDurationHours: Number(row.reservationDurationHours),
            loanDurationDays: Number(row.loanDurationDays),
            extensionDurationDays: Number(row.extensionDurationDays),
            maxExtensions:
              row.maxExtensions === null ? null : Number(row.maxExtensions),
          }
        : this.defaults();
    } catch {
      return this.defaults();
    }
  }

  async updateSettings(body: unknown): Promise<LibrarySettings> {
    const input = parseLibrarySettingsInput(body);
    try {
      await this.prisma.$executeRaw`
        INSERT INTO library_settings (
          id,
          libraryName,
          address,
          serviceHours,
          phoneE164,
          reservationDurationHours,
          loanDurationDays,
          extensionDurationDays,
          maxExtensions
        ) VALUES (
          1,
          ${input.libraryName},
          ${input.address},
          ${input.serviceHours},
          ${input.phoneE164},
          ${input.reservationDurationHours},
          ${input.loanDurationDays},
          ${input.extensionDurationDays},
          ${input.maxExtensions}
        )
        ON DUPLICATE KEY UPDATE
          libraryName = VALUES(libraryName),
          address = VALUES(address),
          serviceHours = VALUES(serviceHours),
          phoneE164 = VALUES(phoneE164),
          reservationDurationHours = VALUES(reservationDurationHours),
          loanDurationDays = VALUES(loanDurationDays),
          extensionDurationDays = VALUES(extensionDurationDays),
          maxExtensions = VALUES(maxExtensions)
      `;
      return input;
    } catch {
      throw new ServiceUnavailableException(
        'Pengaturan belum dapat disimpan. Pastikan tabel pengaturan perpustakaan sudah tersedia.',
      );
    }
  }

  async notifications(query: {
    search?: unknown;
    channel?: unknown;
    page?: unknown;
    limit?: unknown;
  }) {
    const filter = parseNotificationQuery(query);
    const notices = await this.prisma.notification.findMany({
      where: {
        OR: [
          { emailDelivery: { not: 'NOT_REQUIRED' } },
          { whatsappDelivery: { not: 'NOT_REQUIRED' } },
        ],
      },
      select: {
        id: true,
        eventKey: true,
        title: true,
        message: true,
        createdAt: true,
        emailDelivery: true,
        emailAttemptedAt: true,
        emailSentAt: true,
        whatsappDelivery: true,
        user: {
          select: {
            name: true,
            email: true,
            memberProfile: { select: { whatsapp: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const projected: AdminNotificationRow[] = [];
    for (const notice of notices) {
      const base = {
        sourceNotificationId: notice.id,
        memberName: notice.user.name,
        memberEmail: notice.user.email,
        memberWhatsapp: notice.user.memberProfile?.whatsapp ?? '',
        transactionCode: transactionCode(notice.eventKey),
        reminderType: reminderType(notice.eventKey, notice.title),
      };
      if (notice.emailDelivery !== 'NOT_REQUIRED') {
        projected.push({
          ...base,
          id: `${notice.id}:EMAIL`,
          channel: 'EMAIL',
          time: notice.emailSentAt ?? notice.emailAttemptedAt ?? notice.createdAt,
          status: emailStatus(notice.emailDelivery),
        });
      }
      if (notice.whatsappDelivery !== 'NOT_REQUIRED') {
        projected.push({
          ...base,
          id: `${notice.id}:WHATSAPP`,
          channel: 'WHATSAPP',
          time: notice.createdAt,
          status: whatsappStatus(notice.whatsappDelivery),
        });
      }
    }

    const needle = filter.search.toLocaleLowerCase('id-ID');
    const searched = needle
      ? projected.filter((row) =>
          [
            row.memberName,
            row.memberEmail,
            row.memberWhatsapp,
            row.transactionCode,
            row.reminderType,
          ]
            .join(' ')
            .toLocaleLowerCase('id-ID')
            .includes(needle),
        )
      : projected;

    const counts = {
      all: searched.length,
      email: searched.filter((row) => row.channel === 'EMAIL').length,
      whatsapp: searched.filter((row) => row.channel === 'WHATSAPP').length,
      failed: searched.filter((row) => row.status === 'GAGAL').length,
    };
    const channelRows =
      filter.channel === 'ALL'
        ? searched
        : searched.filter((row) => row.channel === filter.channel);
    const totalPages = Math.max(1, Math.ceil(channelRows.length / filter.limit));
    const page = Math.min(filter.page, totalPages);
    const start = (page - 1) * filter.limit;

    return {
      counts,
      data: channelRows.slice(start, start + filter.limit),
      meta: {
        page,
        limit: filter.limit,
        total: channelRows.length,
        totalPages,
      },
    };
  }

  async reports(query: { from?: unknown; to?: unknown }) {
    const range = parseReportRange(query.from, query.to);
    const during = { gte: range.start, lt: range.endExclusive };

    const [
      borrowed,
      returned,
      expiredReservations,
      dueLoans,
      reservationActivity,
      ebookActivity,
      grants,
      lostNotices,
    ] = await Promise.all([
      this.prisma.loan.findMany({
        where: { borrowedAt: during },
        select: {
          id: true,
          userId: true,
          borrowedAt: true,
          bookId: true,
          book: { select: { title: true } },
        },
      }),
      this.prisma.loan.findMany({
        where: { returnedAt: during },
        select: { id: true, userId: true, returnedAt: true },
      }),
      this.prisma.reservation.count({
        where: { status: 'KEDALUWARSA', expiresAt: during },
      }),
      this.prisma.loan.findMany({
        where: { dueAt: during },
        select: { dueAt: true, returnedAt: true, status: true },
      }),
      this.prisma.reservation.findMany({
        where: { createdAt: during },
        select: { userId: true },
      }),
      this.prisma.userEBook.findMany({
        where: { addedAt: during },
        select: { userId: true },
      }),
      this.prisma.bookGrant.findMany({
        where: { receivedAt: during },
        select: { items: { select: { quantity: true } } },
      }),
      this.prisma.notification.findMany({
        where: { createdAt: during, eventKey: { startsWith: 'loan:' } },
        select: { eventKey: true },
      }),
    ]);

    const overdue = dueLoans.filter(
      (loan) =>
        loan.status === 'HILANG' ||
        loan.returnedAt === null ||
        loan.returnedAt.getTime() > loan.dueAt.getTime(),
    ).length;

    const popular = new Map<number, { title: string; count: number }>();
    for (const loan of borrowed) {
      const current = popular.get(loan.bookId);
      popular.set(loan.bookId, {
        title: loan.book.title,
        count: (current?.count ?? 0) + 1,
      });
    }
    const popularBook = [...popular.values()].sort(
      (a, b) => b.count - a.count || a.title.localeCompare(b.title, 'id-ID'),
    )[0];

    const activeUserIds = new Set<number>();
    borrowed.forEach((row) => activeUserIds.add(row.userId));
    returned.forEach((row) => activeUserIds.add(row.userId));
    reservationActivity.forEach((row) => activeUserIds.add(row.userId));
    ebookActivity.forEach((row) => activeUserIds.add(row.userId));

    const grantsReceived = grants.reduce(
      (total, grant) =>
        total + grant.items.reduce((sum, item) => sum + item.quantity, 0),
      0,
    );
    const lostBooks = lostNotices.filter((notice) =>
      /^loan:\d+:lost$/.test(notice.eventKey),
    ).length;

    const buckets = new Map(
      monthKeys(range.from, range.to).map((key) => [
        key,
        { key, label: monthLabel(key), borrowings: 0, returns: 0 },
      ]),
    );
    borrowed.forEach((loan) => {
      const bucket = buckets.get(monthKeyFromDate(loan.borrowedAt));
      if (bucket) bucket.borrowings += 1;
    });
    returned.forEach((loan) => {
      if (!loan.returnedAt) return;
      const bucket = buckets.get(monthKeyFromDate(loan.returnedAt));
      if (bucket) bucket.returns += 1;
    });

    return {
      range: { from: range.from, to: range.to },
      stats: {
        borrowings: borrowed.length,
        returns: returned.length,
        expiredReservations,
        overdue,
        popularBook: popularBook?.title ?? '-',
        popularBookCount: popularBook?.count ?? 0,
        activeMembers: activeUserIds.size,
        grantsReceived,
        lostBooks,
      },
      trend: [...buckets.values()],
    };
  }
}
