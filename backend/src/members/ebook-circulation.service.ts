import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ebookProgressInput } from './member.validation';

export const EBOOK_LOAN_MS = 7 * 24 * 60 * 60 * 1000;
export const EBOOK_OFFER_MS = 24 * 60 * 60 * 1000;
const RETRY_EMAIL_AFTER_MS = 15 * 60 * 1000;
const ACTIVE_QUEUE_STATUSES = ['MENUNGGU', 'DITAWARKAN'] as const;

type Tx = Prisma.TransactionClient;

type CirculationState =
  | 'AVAILABLE'
  | 'BORROWED_BY_ME'
  | 'BORROWED_BY_OTHER'
  | 'QUEUED'
  | 'OFFERED_TO_ME'
  | 'UNAVAILABLE';

const ebookBookSelect = {
  id: true,
  title: true,
  code: true,
  coverUrl: true,
  author: true,
  format: true,
  isActive: true,
} as const;

const loanInclude = {
  book: { select: ebookBookSelect },
} as const;

const queueInclude = {
  book: { select: ebookBookSelect },
} as const;

const readingInclude = {
  book: { select: ebookBookSelect },
} as const;

type LoanRow = Prisma.EBookLoanGetPayload<{ include: typeof loanInclude }>;
type QueueRow = Prisma.EBookQueueGetPayload<{ include: typeof queueInclude }>;
type ReadingRow = Prisma.UserEBookGetPayload<{ include: typeof readingInclude }>;

type QueuePositionClient = {
  eBookQueue: {
    findMany(args: {
      where: {
        bookId: number;
        status: { in: Array<'MENUNGGU' | 'DITAWARKAN'> };
      };
      select: { id: true };
      orderBy: Array<{ queuedAt?: 'asc'; id?: 'asc' }>;
    }): Promise<Array<{ id: number }>>;
  };
};

@Injectable()
export class EBookCirculationService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EBookCirculationService.name);
  private timer?: ReturnType<typeof setInterval>;
  private processing = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.runMaintenance(), 30000);
    this.timer.unref();
    void this.runMaintenance();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 15000,
        });
      } catch (error) {
        const known = error as {
          code?: string;
          meta?: {
            code?: string;
            driverAdapterError?: { cause?: { originalCode?: string } };
          };
        };
        const deadlock =
          known.code === 'P2034' ||
          (known.code === 'P2010' &&
            ['1213', '1205'].includes(String(known.meta?.code))) ||
          ['1213', '1205'].includes(
            String(known.meta?.driverAdapterError?.cause?.originalCode),
          );
        if (!deadlock || attempt >= 2) throw error;
      }
    }
  }

  private queueKey(userId: number, bookId: number) {
    return `${userId}:${bookId}`;
  }

  private async lockBook(tx: Tx, bookId: number) {
    const locked = await tx.$queryRaw<{ id: number }[]>`
      SELECT id FROM books WHERE id = ${bookId} FOR UPDATE
    `;
    if (!locked.length) throw new NotFoundException('E-Book tidak ditemukan.');
    const book = await tx.book.findUnique({
      where: { id: bookId },
      select: {
        id: true,
        title: true,
        type: true,
        isActive: true,
      },
    });
    if (!book || book.type !== 'EBOOK')
      throw new NotFoundException('E-Book tidak ditemukan.');
    return book;
  }

  private assertActiveBook(book: { isActive: boolean }) {
    if (!book.isActive)
      throw new ConflictException('E-Book sedang tidak tersedia untuk dipinjam.');
  }

  private async createEvent(
    tx: Tx,
    userId: number,
    eventKey: string,
    title: string,
    message: string,
  ) {
    await tx.notification.createMany({
      data: [
        {
          userId,
          eventKey,
          title,
          message,
          href: '/dashboard/e-book',
          emailDelivery: 'PENDING',
          whatsappDelivery: 'NOT_REQUIRED',
        },
      ],
      skipDuplicates: true,
    });
  }

  private async promoteNextLocked(tx: Tx, bookId: number, now: Date) {
    const book = await tx.book.findUnique({
      where: { id: bookId },
      select: { type: true, isActive: true },
    });
    if (!book || book.type !== 'EBOOK' || !book.isActive) return null;

    const activeLoan = await tx.eBookLoan.findFirst({
      where: { bookId, status: 'AKTIF', dueAt: { gt: now } },
      select: { id: true },
    });
    if (activeLoan) return null;

    const offered = await tx.eBookQueue.findFirst({
      where: {
        bookId,
        status: 'DITAWARKAN',
        claimExpiresAt: { gt: now },
      },
      select: { id: true },
    });
    if (offered) return null;

    const next = await tx.eBookQueue.findFirst({
      where: { bookId, status: 'MENUNGGU' },
      include: { book: { select: { title: true } } },
      orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }],
    });
    if (!next) return null;

    const claimExpiresAt = new Date(now.getTime() + EBOOK_OFFER_MS);
    const promoted = await tx.eBookQueue.update({
      where: { id: next.id },
      data: {
        status: 'DITAWARKAN',
        offeredAt: now,
        claimExpiresAt,
      },
      include: queueInclude,
    });
    await this.createEvent(
      tx,
      next.userId,
      `ebook:queue:${next.id}:offered`,
      'Giliran E-Book Anda tersedia',
      `${next.book.title} sudah tersedia untuk Anda. Pinjam E-Book dalam 24 jam sebelum giliran diteruskan ke anggota berikutnya.`,
    );
    return promoted;
  }

  private async settleLockedBook(tx: Tx, bookId: number, now: Date) {
    const expiredLoan = await tx.eBookLoan.findFirst({
      where: { bookId, status: 'AKTIF', dueAt: { lte: now } },
      include: { book: { select: { title: true } } },
    });
    if (expiredLoan) {
      const changed = await tx.eBookLoan.updateMany({
        where: {
          id: expiredLoan.id,
          status: 'AKTIF',
          dueAt: { lte: now },
        },
        data: {
          status: 'KEDALUWARSA',
          endedAt: now,
          activeBookId: null,
        },
      });
      if (changed.count) {
        await this.createEvent(
          tx,
          expiredLoan.userId,
          `ebook:loan:${expiredLoan.id}:expired`,
          'Masa akses E-Book telah habis',
          `Masa akses ${expiredLoan.book.title} telah berakhir. E-Book tidak dapat dibaca lagi sampai Anda meminjamnya kembali. Progres membaca terakhir tetap tersimpan.`,
        );
      }
    }

    const expiredOffers = await tx.eBookQueue.findMany({
      where: {
        bookId,
        status: 'DITAWARKAN',
        claimExpiresAt: { lte: now },
      },
      include: { book: { select: { title: true } } },
      orderBy: [{ claimExpiresAt: 'asc' }, { id: 'asc' }],
    });
    for (const offer of expiredOffers) {
      const changed = await tx.eBookQueue.updateMany({
        where: {
          id: offer.id,
          status: 'DITAWARKAN',
          claimExpiresAt: { lte: now },
        },
        data: {
          status: 'KEDALUWARSA',
          activeKey: null,
          expiredAt: now,
        },
      });
      if (!changed.count) continue;
      await this.createEvent(
        tx,
        offer.userId,
        `ebook:queue:${offer.id}:offer-expired`,
        'Giliran E-Book telah kedaluwarsa',
        `Waktu prioritas 24 jam untuk meminjam ${offer.book.title} telah berakhir. Jika masih berminat, Anda dapat masuk antrean kembali.`,
      );
    }

    await this.promoteNextLocked(tx, bookId, now);
  }

  async runMaintenanceForBook(bookId: number, now = new Date()) {
    await this.transaction(async (tx) => {
      await this.lockBook(tx, bookId);
      await this.settleLockedBook(tx, bookId, now);
    });
  }

  async runMaintenance() {
    if (this.processing) return;
    this.processing = true;
    try {
      const now = new Date();
      const [expiredLoans, expiredOffers] = await Promise.all([
        this.prisma.eBookLoan.findMany({
          where: { status: 'AKTIF', dueAt: { lte: now } },
          select: { bookId: true },
        }),
        this.prisma.eBookQueue.findMany({
          where: { status: 'DITAWARKAN', claimExpiresAt: { lte: now } },
          select: { bookId: true },
        }),
      ]);
      const bookIds = new Set<number>([
        ...expiredLoans.map((row) => row.bookId),
        ...expiredOffers.map((row) => row.bookId),
      ]);
      for (const bookId of bookIds)
        await this.runMaintenanceForBook(bookId, now);
      await this.deliverPendingEmails();
    } catch {
      this.logger.warn(
        'Pemrosesan sirkulasi E-Book belum berhasil; akan dicoba lagi.',
      );
    } finally {
      this.processing = false;
    }
  }

  private loanView(row: LoanRow) {
    return {
      id: row.id,
      status: row.status,
      borrowedAt: row.borrowedAt,
      dueAt: row.dueAt,
      endedAt: row.endedAt,
      bookId: row.bookId,
      book: row.book,
    };
  }

  private readingView(row: ReadingRow) {
    return {
      id: row.id,
      bookId: row.bookId,
      book: row.book,
      addedAt: row.addedAt,
      lastOpenedAt: row.lastOpenedAt,
      progress: row.progress,
      lastPosition: row.lastPosition,
      progressVersion: row.progressVersion,
    };
  }

  private async queuePosition(
    client: QueuePositionClient,
    row: { id: number; bookId: number },
  ) {
    const ordered = await client.eBookQueue.findMany({
      where: {
        bookId: row.bookId,
        status: { in: [...ACTIVE_QUEUE_STATUSES] },
      },
      select: { id: true },
      orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }],
    });
    const index = ordered.findIndex((entry) => entry.id === row.id);
    return index < 0 ? null : index + 1;
  }

  private async queueView(
    client: QueuePositionClient,
    row: QueueRow,
  ) {
    return {
      id: row.id,
      status: row.status,
      bookId: row.bookId,
      book: row.book,
      queuedAt: row.queuedAt,
      offeredAt: row.offeredAt,
      claimExpiresAt: row.claimExpiresAt,
      position: await this.queuePosition(client, row),
    };
  }

  private async snapshotLocked(
    tx: Tx,
    userId: number,
    bookId: number,
    now: Date,
    bookActive: boolean,
  ) {
    const [loan, mineQueue, activeQueues] = await Promise.all([
      tx.eBookLoan.findFirst({
        where: { bookId, status: 'AKTIF', dueAt: { gt: now } },
        include: loanInclude,
      }),
      tx.eBookQueue.findFirst({
        where: {
          activeKey: this.queueKey(userId, bookId),
          status: { in: [...ACTIVE_QUEUE_STATUSES] },
        },
        include: queueInclude,
      }),
      tx.eBookQueue.findMany({
        where: {
          bookId,
          status: { in: [...ACTIVE_QUEUE_STATUSES] },
        },
        select: { id: true, status: true, userId: true, claimExpiresAt: true },
        orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }],
      }),
    ]);

    if (!bookActive) {
      return {
        state: 'UNAVAILABLE' as CirculationState,
        bookId,
        canBorrow: false,
        canQueue: false,
      };
    }

    if (loan?.userId === userId) {
      return {
        state: 'BORROWED_BY_ME' as CirculationState,
        bookId,
        canBorrow: false,
        canQueue: false,
        loan: this.loanView(loan),
      };
    }

    if (mineQueue) {
      const queue = await this.queueView(tx, mineQueue);
      return {
        state: (mineQueue.status === 'DITAWARKAN'
          ? 'OFFERED_TO_ME'
          : 'QUEUED') as CirculationState,
        bookId,
        canBorrow: mineQueue.status === 'DITAWARKAN',
        canQueue: false,
        queue,
        activeBorrowerDueAt: loan?.dueAt ?? null,
      };
    }

    if (loan || activeQueues.length) {
      return {
        state: 'BORROWED_BY_OTHER' as CirculationState,
        bookId,
        canBorrow: false,
        canQueue: true,
        activeBorrowerDueAt: loan?.dueAt ?? null,
      };
    }

    return {
      state: 'AVAILABLE' as CirculationState,
      bookId,
      canBorrow: true,
      canQueue: false,
    };
  }

  async getStatus(userId: number, bookId: number) {
    const now = new Date();
    return this.transaction(async (tx) => {
      const book = await this.lockBook(tx, bookId);
      await this.settleLockedBook(tx, bookId, now);
      return this.snapshotLocked(tx, userId, bookId, now, book.isActive);
    });
  }

  async borrow(userId: number, bookId: number) {
    const now = new Date();
    const loan = await this.transaction(async (tx) => {
      const book = await this.lockBook(tx, bookId);
      this.assertActiveBook(book);
      await this.settleLockedBook(tx, bookId, now);

      const activeLoan = await tx.eBookLoan.findFirst({
        where: { bookId, status: 'AKTIF', dueAt: { gt: now } },
        include: loanInclude,
      });
      if (activeLoan) {
        if (activeLoan.userId === userId) return activeLoan;
        throw new ConflictException(
          'E-Book sedang dipinjam anggota lain. Silakan masuk antrean.',
        );
      }

      let offered = await tx.eBookQueue.findFirst({
        where: {
          bookId,
          status: 'DITAWARKAN',
          claimExpiresAt: { gt: now },
        },
        include: queueInclude,
        orderBy: [{ offeredAt: 'asc' }, { id: 'asc' }],
      });

      if (!offered) {
        const waiting = await tx.eBookQueue.findFirst({
          where: { bookId, status: 'MENUNGGU' },
          select: { id: true },
          orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }],
        });
        if (waiting) {
          await this.promoteNextLocked(tx, bookId, now);
          offered = await tx.eBookQueue.findFirst({
            where: {
              bookId,
              status: 'DITAWARKAN',
              claimExpiresAt: { gt: now },
            },
            include: queueInclude,
            orderBy: [{ offeredAt: 'asc' }, { id: 'asc' }],
          });
        }
      }

      if (offered) {
        if (offered.userId !== userId)
          throw new ConflictException(
            'E-Book sedang diprioritaskan untuk anggota pertama dalam antrean.',
          );
        await tx.eBookQueue.update({
          where: { id: offered.id },
          data: {
            status: 'DIKLAIM',
            activeKey: null,
            claimedAt: now,
          },
        });
      }

      try {
        return await tx.eBookLoan.create({
          data: {
            userId,
            bookId,
            activeBookId: bookId,
            status: 'AKTIF',
            borrowedAt: now,
            dueAt: new Date(now.getTime() + EBOOK_LOAN_MS),
          },
          include: loanInclude,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        )
          throw new ConflictException(
            'E-Book baru saja dipinjam anggota lain. Silakan masuk antrean.',
          );
        throw error;
      }
    });
    return { success: true, loan: this.loanView(loan) };
  }

  async returnBook(userId: number, bookId: number) {
    const now = new Date();
    const result = await this.transaction(async (tx) => {
      await this.lockBook(tx, bookId);
      await this.settleLockedBook(tx, bookId, now);
      const loan = await tx.eBookLoan.findFirst({
        where: {
          userId,
          bookId,
          status: 'AKTIF',
          dueAt: { gt: now },
        },
        include: loanInclude,
      });
      if (!loan)
        throw new ConflictException('Anda tidak memiliki pinjaman aktif untuk E-Book ini.');

      const returned = await tx.eBookLoan.update({
        where: { id: loan.id },
        data: {
          status: 'DIKEMBALIKAN',
          endedAt: now,
          activeBookId: null,
        },
        include: loanInclude,
      });
      await this.createEvent(
        tx,
        userId,
        `ebook:loan:${loan.id}:returned`,
        'E-Book berhasil dikembalikan',
        `${loan.book.title} telah dikembalikan. Progres membaca terakhir tetap tersimpan untuk peminjaman berikutnya.`,
      );
      const promoted = await this.promoteNextLocked(tx, bookId, now);
      return { returned, promoted };
    });
    void this.deliverPendingEmails();
    return {
      success: true,
      loan: this.loanView(result.returned),
      nextQueuePromoted: Boolean(result.promoted),
    };
  }

  async joinQueue(userId: number, bookId: number) {
    const now = new Date();
    const row = await this.transaction(async (tx) => {
      const book = await this.lockBook(tx, bookId);
      this.assertActiveBook(book);
      await this.settleLockedBook(tx, bookId, now);

      const ownLoan = await tx.eBookLoan.findFirst({
        where: { userId, bookId, status: 'AKTIF', dueAt: { gt: now } },
        select: { id: true },
      });
      if (ownLoan)
        throw new ConflictException('Anda sedang meminjam E-Book ini.');

      const existing = await tx.eBookQueue.findFirst({
        where: {
          activeKey: this.queueKey(userId, bookId),
          status: { in: [...ACTIVE_QUEUE_STATUSES] },
        },
        include: queueInclude,
      });
      if (existing) return existing;

      const [activeLoan, activeQueue] = await Promise.all([
        tx.eBookLoan.findFirst({
          where: { bookId, status: 'AKTIF', dueAt: { gt: now } },
          select: { id: true },
        }),
        tx.eBookQueue.findFirst({
          where: {
            bookId,
            status: { in: [...ACTIVE_QUEUE_STATUSES] },
          },
          select: { id: true },
        }),
      ]);
      if (!activeLoan && !activeQueue)
        throw new ConflictException(
          'E-Book tersedia sekarang. Silakan pilih Pinjam E-Book.',
        );

      try {
        return await tx.eBookQueue.create({
          data: {
            userId,
            bookId,
            activeKey: this.queueKey(userId, bookId),
            status: 'MENUNGGU',
            queuedAt: now,
          },
          include: queueInclude,
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          const duplicate = await tx.eBookQueue.findFirst({
            where: { activeKey: this.queueKey(userId, bookId) },
            include: queueInclude,
          });
          if (duplicate) return duplicate;
        }
        throw error;
      }
    });
    return { success: true, queue: await this.queueView(this.prisma, row) };
  }

  async cancelQueue(userId: number, bookId: number) {
    const now = new Date();
    const result = await this.transaction(async (tx) => {
      await this.lockBook(tx, bookId);
      await this.settleLockedBook(tx, bookId, now);
      const row = await tx.eBookQueue.findFirst({
        where: {
          activeKey: this.queueKey(userId, bookId),
          status: { in: [...ACTIVE_QUEUE_STATUSES] },
        },
      });
      if (!row) throw new NotFoundException('Antrean E-Book tidak ditemukan.');
      const wasOffered = row.status === 'DITAWARKAN';
      await tx.eBookQueue.update({
        where: { id: row.id },
        data: {
          status: 'DIBATALKAN',
          activeKey: null,
          cancelledAt: now,
        },
      });
      const promoted = wasOffered
        ? await this.promoteNextLocked(tx, bookId, now)
        : null;
      return { promoted };
    });
    if (result.promoted) void this.deliverPendingEmails();
    return { success: true, nextQueuePromoted: Boolean(result.promoted) };
  }

  async open(userId: number, bookId: number) {
    const now = new Date();
    const row = await this.transaction(async (tx) => {
      const book = await this.lockBook(tx, bookId);
      this.assertActiveBook(book);
      await this.settleLockedBook(tx, bookId, now);
      const loan = await tx.eBookLoan.findFirst({
        where: {
          userId,
          bookId,
          status: 'AKTIF',
          dueAt: { gt: now },
        },
        select: { id: true },
      });
      if (!loan)
        throw new ForbiddenException(
          'Akses E-Book tidak aktif. Pinjam E-Book terlebih dahulu.',
        );
      return tx.userEBook.upsert({
        where: { userId_bookId: { userId, bookId } },
        update: { lastOpenedAt: now },
        create: { userId, bookId, lastOpenedAt: now },
        include: readingInclude,
      });
    });
    return { success: true, ebook: this.readingView(row) };
  }

  async updateProgress(userId: number, bookId: number, body: unknown) {
    const input = ebookProgressInput(body);
    const now = new Date();
    const row = await this.transaction(async (tx) => {
      const book = await this.lockBook(tx, bookId);
      this.assertActiveBook(book);
      await this.settleLockedBook(tx, bookId, now);
      const loan = await tx.eBookLoan.findFirst({
        where: {
          userId,
          bookId,
          status: 'AKTIF',
          dueAt: { gt: now },
        },
        select: { id: true },
      });
      if (!loan)
        throw new ForbiddenException(
          'Masa akses E-Book telah berakhir. Progres baru tidak dapat disimpan.',
        );

      await tx.$queryRaw`
        SELECT id FROM user_ebooks
        WHERE userId = ${userId} AND bookId = ${bookId}
        FOR UPDATE
      `;
      const current = await tx.userEBook.findFirst({
        where: { userId, bookId, book: { type: 'EBOOK' } },
        include: readingInclude,
      });
      if (!current)
        throw new NotFoundException(
          'Bacaan belum pernah dibuka. Buka reader sebelum menyimpan progres.',
        );
      if (current.progressVersion !== input.expectedVersion)
        throw new ConflictException(
          'Posisi baca telah berubah di sesi lain. Muat ulang pembaca sebelum menyimpan kembali.',
        );
      return tx.userEBook.update({
        where: { id: current.id },
        include: readingInclude,
        data: {
          progress: Math.max(current.progress, input.progress),
          lastPosition: input.lastPosition,
          progressVersion: { increment: 1 },
        },
      });
    });
    return { ebook: this.readingView(row) };
  }

  private async settleUserBooks(userId: number) {
    const [loans, queues] = await Promise.all([
      this.prisma.eBookLoan.findMany({
        where: { userId, status: 'AKTIF' },
        select: { bookId: true },
      }),
      this.prisma.eBookQueue.findMany({
        where: {
          userId,
          status: { in: [...ACTIVE_QUEUE_STATUSES] },
        },
        select: { bookId: true },
      }),
    ]);
    const ids = new Set<number>([
      ...loans.map((row) => row.bookId),
      ...queues.map((row) => row.bookId),
    ]);
    for (const bookId of ids) await this.runMaintenanceForBook(bookId);
  }

  async listMine(userId: number) {
    await this.settleUserBooks(userId);
    const now = new Date();
    const [activeLoans, queues, readings] = await Promise.all([
      this.prisma.eBookLoan.findMany({
        where: { userId, status: 'AKTIF', dueAt: { gt: now } },
        include: loanInclude,
        orderBy: { dueAt: 'asc' },
      }),
      this.prisma.eBookQueue.findMany({
        where: {
          userId,
          status: { in: [...ACTIVE_QUEUE_STATUSES] },
        },
        include: queueInclude,
        orderBy: [{ queuedAt: 'asc' }, { id: 'asc' }],
      }),
      this.prisma.userEBook.findMany({
        where: {
          userId,
          lastOpenedAt: { not: null },
          book: { type: 'EBOOK' },
        },
        include: readingInclude,
        orderBy: [{ lastOpenedAt: 'desc' }, { addedAt: 'desc' }],
      }),
    ]);

    const readingByBook = new Map(readings.map((row) => [row.bookId, row]));
    const loans = activeLoans.map((row) => ({
      ...this.loanView(row),
      reading: readingByBook.has(row.bookId)
        ? this.readingView(readingByBook.get(row.bookId)!)
        : null,
    }));
    const queueViews = await Promise.all(
      queues.map((row) => this.queueView(this.prisma, row)),
    );
    const history = await Promise.all(
      readings.map(async (row) => ({
        ...this.readingView(row),
        circulation: await this.getStatus(userId, row.bookId),
      })),
    );

    return {
      activeLoans: loans,
      queues: queueViews,
      readHistory: history,
      // Compatibility for older callers: this is now truly "pernah dibaca".
      ebooks: readings.map((row) => this.readingView(row)),
    };
  }

  private async offerStillValid(eventKey: string, now: Date) {
    const match = /^ebook:queue:(\d+):offered$/.exec(eventKey);
    if (!match) return true;
    const queue = await this.prisma.eBookQueue.findUnique({
      where: { id: Number(match[1]) },
      select: { status: true, claimExpiresAt: true },
    });
    return Boolean(
      queue &&
        queue.status === 'DITAWARKAN' &&
        queue.claimExpiresAt &&
        queue.claimExpiresAt > now,
    );
  }

  private async deliverPendingEmails() {
    if (!this.mail.isConfigured()) return;
    const now = new Date();
    const retryBefore = new Date(now.getTime() - RETRY_EMAIL_AFTER_MS);
    await this.prisma.notification.updateMany({
      where: {
        eventKey: { startsWith: 'ebook:' },
        emailDelivery: 'SENDING',
        emailAttempts: { gte: 5 },
        emailAttemptedAt: { lt: retryBefore },
      },
      data: { emailDelivery: 'FAILED' },
    });
    const pending = await this.prisma.notification.findMany({
      where: {
        eventKey: { startsWith: 'ebook:' },
        emailAttempts: { lt: 5 },
        OR: [
          { emailDelivery: 'PENDING' },
          { emailDelivery: 'FAILED', emailAttemptedAt: { lt: retryBefore } },
          { emailDelivery: 'SENDING', emailAttemptedAt: { lt: retryBefore } },
        ],
      },
      include: { user: { select: { email: true } } },
      orderBy: { id: 'asc' },
      take: 20,
    });

    for (const notice of pending) {
      if (!(await this.offerStillValid(notice.eventKey, now))) {
        await this.prisma.notification.updateMany({
          where: { id: notice.id, emailDelivery: notice.emailDelivery },
          data: { emailDelivery: 'NOT_REQUIRED' },
        });
        continue;
      }
      const claim = await this.prisma.notification.updateMany({
        where: {
          id: notice.id,
          emailDelivery: notice.emailDelivery,
          emailAttempts: notice.emailAttempts,
          emailAttemptedAt: notice.emailAttemptedAt,
        },
        data: {
          emailDelivery: 'SENDING',
          emailAttemptedAt: new Date(),
          emailAttempts: { increment: 1 },
        },
      });
      if (!claim.count) continue;
      let sent = false;
      try {
        sent = await this.mail.sendEBookNotification(
          notice.user.email,
          notice.title,
          notice.message,
        );
      } catch {
        /* SMTP errors are persisted as FAILED without logging sensitive content. */
      }
      await this.prisma.notification.update({
        where: { id: notice.id },
        data: {
          emailDelivery: sent ? 'SENT' : 'FAILED',
          ...(sent ? { emailSentAt: new Date() } : {}),
        },
      });
    }
  }
}
