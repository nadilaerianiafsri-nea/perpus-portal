import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { serviceInfo } from '../../../shared/serviceInfo.cjs';
import { buildTransactionTrend } from '../../../shared/chartTime.cjs';
import { PrismaService } from '../prisma/prisma.service';
import {
  type LibrarySettings,
  parseLibrarySettingsInput,
  parseNotificationQuery,
  parseReportRange,
  parseChartGranularity,
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

const DAY_MS = 24 * 60 * 60 * 1000;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

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
  bookTitle: string | null;
  channel: 'SYSTEM' | 'EMAIL' | 'WHATSAPP';
  time: Date;
  status: 'TERKIRIM' | 'GAGAL' | 'MENUNGGU' | 'MENGIRIM' | 'MANUAL';
  readAt: Date | null;
  href: string | null;
};

function transactionCode(eventKey: string) {
  const match = /^(?:loan|reservation):(\d+):/.exec(eventKey);
  return match ? `TRX-${String(Number(match[1])).padStart(5, '0')}` : '-';
}

function reservationTransactionCode(id: number) {
  return `RSV-${String(id).padStart(5, '0')}`;
}

function reservationCreatedId(eventKey: string) {
  const match = /^reservation:(\d+):created$/.exec(eventKey);
  return match ? Number(match[1]) : null;
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

function jakartaDayRange(now: Date) {
  const local = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const startMs =
    Date.UTC(
      local.getUTCFullYear(),
      local.getUTCMonth(),
      local.getUTCDate(),
    ) - JAKARTA_OFFSET_MS;

  return {
    start: new Date(startMs),
    endExclusive: new Date(startMs + DAY_MS),
  };
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

  async dashboard(query: { from?: unknown; to?: unknown; granularity?: unknown }) {
    const range = parseReportRange(query.from, query.to);
    const granularity = parseChartGranularity(query.granularity, range);
    const during = { gte: range.start, lt: range.endExclusive };
    const now = new Date();
    const today = jakartaDayRange(now);

    const [
      totalCollections,
      totalStock,
      availableStock,
      waitingPickup,
      activeLoans,
      dueToday,
      overdue,
      lostInProcess,
      totalMembers,
      ebooks,
      umum,
      mahasiswa,
      pegawai,
      borrowed,
      returned,
    ] = await Promise.all([
      this.prisma.book.count({
        where: {
          type: 'FISIK',
          isActive: true,
        },
      }),
      this.prisma.bookCopy.count({
        where: {
          book: {
            is: {
              type: 'FISIK',
              isActive: true,
            },
          },
        },
      }),
      this.prisma.bookCopy.count({
        where: {
          status: 'TERSEDIA',
          book: {
            is: {
              type: 'FISIK',
              isActive: true,
            },
          },
        },
      }),
      this.prisma.reservation.count({
        where: {
          status: 'MENUNGGU_PENGAMBILAN',
          expiresAt: {
            gt: now,
          },
        },
      }),
      this.prisma.loan.count({
        where: {
          status: 'AKTIF',
        },
      }),
      this.prisma.loan.count({
        where: {
          status: 'AKTIF',
          dueAt: {
            gte: today.start,
            lt: today.endExclusive,
          },
        },
      }),
      this.prisma.loan.count({
        where: {
          status: 'AKTIF',
          dueAt: {
            lt: now,
          },
        },
      }),
      this.prisma.loan.count({
        where: {
          status: 'HILANG',
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'PENGUNJUNG',
        },
      }),
      this.prisma.book.count({
        where: {
          type: 'EBOOK',
          isActive: true,
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'PENGUNJUNG',
          memberType: 'UMUM',
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'PENGUNJUNG',
          memberType: 'MAHASISWA',
        },
      }),
      this.prisma.user.count({
        where: {
          role: 'PENGUNJUNG',
          memberType: 'PEGAWAI',
        },
      }),
      this.prisma.loan.findMany({
        where: {
          borrowedAt: during,
        },
        select: {
          borrowedAt: true,
        },
      }),
      this.prisma.loan.findMany({
        where: {
          returnedAt: during,
        },
        select: {
          returnedAt: true,
        },
      }),
    ]);

    // Supplementary panels fail independently of each other and the existing KPIs/charts.
    const [topBorrowedCollections, actionRequired] = await Promise.all([
      this.topBorrowedCollections().catch(() => null),
      this.actionRequired(now).catch(() => null),
    ]);

    return {
      granularity,
      generatedAt: now.toISOString(),
      range: {
        from: range.from,
        to: range.to,
      },
      stats: {
        totalCollections,
        totalStock,
        availableStock,
        waitingPickup,
        activeLoans,
        dueToday,
        overdue,
        lostInProcess,
        totalMembers,
        ebooks,
      },
      memberCategories: {
        umum,
        mahasiswa,
        pegawai,
      },
      trend: buildTransactionTrend(range, granularity, borrowed.map((loan) => loan.borrowedAt), returned.map((loan) => loan.returnedAt)),
      topBorrowedCollections,
      actionRequired,
    };
  }

  private async topBorrowedCollections() {
    // Loan rows represent actual pickups. A cancelled/unconverted reservation is not a borrowing.
    // Keep this all-time ranking independent of the existing transaction chart's date selector.
    const ranked = await this.prisma.loan.groupBy({
      by: ['bookId'],
      where: {
        book: { is: { type: 'FISIK', isDemo: false } },
        reservation: { is: { status: 'DIAMBIL' } },
      },
      _count: { id: true },
      orderBy: [{ _count: { id: 'desc' } }, { bookId: 'asc' }],
      take: 5,
    });
    if (!ranked.length) return [];

    const books = await this.prisma.book.findMany({
      where: { id: { in: ranked.map((row) => row.bookId) } },
      select: { id: true, title: true },
    });
    const titles = new Map(books.map((book) => [book.id, book.title]));
    return ranked.flatMap((row) => {
      const title = titles.get(row.bookId);
      return title === undefined ? [] : [{ id: row.bookId, title, borrowCount: row._count.id }];
    });
  }

  private async actionRequired(now: Date) {
    const [expiringReservations, overdueLoans, pendingLostBookReplacements, failedNotifications] = await Promise.all([
      this.prisma.reservation.count({
        where: {
          status: 'MENUNGGU_PENGAMBILAN',
          user: { is: { role: 'PENGUNJUNG' } },
          // Same live (now, now + 2 hours] window as AdminTransactionsService.reservations.
          expiresAt: { gt: now, lte: new Date(now.getTime() + 2 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.loan.count({
        where: {
          status: 'AKTIF', returnedAt: null, dueAt: { lt: now },
          book: { is: { type: 'FISIK' } }, user: { is: { role: 'PENGUNJUNG' } },
        },
      }),
      this.prisma.loan.count({
        where: {
          status: 'HILANG', returnedAt: null,
          book: { is: { type: 'FISIK' } }, user: { is: { role: 'PENGUNJUNG' } },
        },
      }),
      // Email has persisted delivery failures. WhatsApp is manual, without a failure-producing flow.
      this.prisma.notification.count({ where: { emailDelivery: 'FAILED' } }),
    ]);
    return {
      expiringReservations,
      overdueLoans,
      // HILANG is the existing unresolved lost workflow; no separate verification status exists.
      pendingLostBookReplacements,
      failedNotifications,
    };
  }

  async notifications(
    adminId: number,
    query: {
      search?: unknown;
      channel?: unknown;
      page?: unknown;
      limit?: unknown;
    },
  ) {
    const filter = parseNotificationQuery(query);
    const notices = await this.prisma.notification.findMany({
      where: {
        OR: [
          { emailDelivery: { not: 'NOT_REQUIRED' } },
          { whatsappDelivery: { not: 'NOT_REQUIRED' } },
          { eventKey: { startsWith: 'reservation:', endsWith: ':created' } },
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

    const reservationIds = [
      ...new Set(
        notices
          .map((notice) => reservationCreatedId(notice.eventKey))
          .filter((id): id is number => id !== null),
      ),
    ];
    const reservations = reservationIds.length
      ? await this.prisma.reservation.findMany({
          where: { id: { in: reservationIds } },
          select: {
            id: true,
            book: { select: { title: true } },
          },
        })
      : [];
    const reservationTitles = new Map(
      reservations.map((reservation) => [reservation.id, reservation.book.title]),
    );

    const readRows = notices.length
      ? await this.prisma.adminNotificationRead.findMany({
          where: {
            adminId,
            notificationId: { in: notices.map((notice) => notice.id) },
          },
          select: { notificationId: true, readAt: true },
        })
      : [];
    const readByNotification = new Map(
      readRows.map((row) => [row.notificationId, row.readAt]),
    );

    const projected: AdminNotificationRow[] = [];
    for (const notice of notices) {
      const createdReservationId = reservationCreatedId(notice.eventKey);
      const base = {
        sourceNotificationId: notice.id,
        memberName: notice.user.name,
        memberEmail: notice.user.email,
        memberWhatsapp: notice.user.memberProfile?.whatsapp ?? '',
        transactionCode: transactionCode(notice.eventKey),
        reminderType: reminderType(notice.eventKey, notice.title),
        bookTitle: null as string | null,
      };

      if (createdReservationId !== null) {
        projected.push({
          ...base,
          id: `${notice.id}:SYSTEM`,
          transactionCode: reservationTransactionCode(createdReservationId),
          reminderType: 'Reservasi Baru',
          bookTitle: reservationTitles.get(createdReservationId) ?? null,
          channel: 'SYSTEM',
          time: notice.createdAt,
          status: 'MENUNGGU',
          readAt: readByNotification.get(notice.id) ?? null,
          href: '/admin/transaksi/reservasi',
        });
      }

      if (notice.emailDelivery !== 'NOT_REQUIRED') {
        projected.push({
          ...base,
          id: `${notice.id}:EMAIL`,
          channel: 'EMAIL',
          time: notice.emailSentAt ?? notice.emailAttemptedAt ?? notice.createdAt,
          status: emailStatus(notice.emailDelivery),
          readAt: null,
          href: null,
        });
      }
      if (notice.whatsappDelivery !== 'NOT_REQUIRED') {
        projected.push({
          ...base,
          id: `${notice.id}:WHATSAPP`,
          channel: 'WHATSAPP',
          time: notice.createdAt,
          status: whatsappStatus(notice.whatsappDelivery),
          readAt: null,
          href: null,
        });
      }
    }

    projected.sort(
      (left, right) =>
        right.time.getTime() - left.time.getTime() ||
        right.sourceNotificationId - left.sourceNotificationId,
    );

    const needle = filter.search.toLocaleLowerCase('id-ID');
    const searched = needle
      ? projected.filter((row) =>
          [
            row.memberName,
            row.memberEmail,
            row.memberWhatsapp,
            row.transactionCode,
            row.reminderType,
            row.bookTitle ?? '',
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
      unread: searched.filter(
        (row) => row.channel === 'SYSTEM' && row.readAt === null,
      ).length,
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

  async unreadNotificationCount(adminId: number) {
    const unread = await this.prisma.notification.count({
      where: {
        eventKey: { startsWith: 'reservation:', endsWith: ':created' },
        adminReads: { none: { adminId } },
      },
    });
    return { unread };
  }

  async markNotificationRead(adminId: number, notificationId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        eventKey: { startsWith: 'reservation:', endsWith: ':created' },
      },
      select: { id: true },
    });

    if (!notification) {
      throw new NotFoundException('Notifikasi sistem tidak ditemukan atau tidak dapat ditandai.');
    }

    const read = await this.prisma.adminNotificationRead.upsert({
      where: {
        adminId_notificationId: { adminId, notificationId },
      },
      update: {},
      create: { adminId, notificationId },
      select: { readAt: true },
    });

    return { readAt: read.readAt };
  }

  async reports(query: { from?: unknown; to?: unknown; granularity?: unknown }) {
    const range = parseReportRange(query.from, query.to);
    const granularity = parseChartGranularity(query.granularity, range);
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

    return {
      granularity,
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
      trend: buildTransactionTrend(range, granularity, borrowed.map((loan) => loan.borrowedAt), returned.map((loan) => loan.returnedAt)),
    };
  }
}
