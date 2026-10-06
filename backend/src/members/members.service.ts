import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { serviceInfo } from '../../../shared/serviceInfo.cjs';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { Prisma } from '../generated/prisma/client';
import {
  bookInput,
  jakartaDay,
  profileInput,
  reminderMilestone,
} from './member.validation';

const DAY = 86400000;
const bookSelect = {
  id: true,
  title: true,
  code: true,
  coverUrl: true,
  author: true,
} as const;
const circulationInclude = {
  book: { select: bookSelect },
  copy: { select: { id: true, code: true, status: true } },
} as const;
const notificationSelect = {
  id: true,
  title: true,
  message: true,
  createdAt: true,
  readAt: true,
  href: true,
} as const;
type Tx = Prisma.TransactionClient;

@Injectable()
export class MembersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MembersService.name);
  private timer?: ReturnType<typeof setInterval>;
  private processing = false;
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @Optional() private readonly config?: ConfigService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.background(), 30000);
    this.timer.unref();
    void this.background();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  private async background() {
    if (this.processing) return;
    this.processing = true;
    try {
      await this.expireReservations();
      await this.createReminders();
      await this.deliverReminders();
    } catch {
      this.logger.warn(
        'Pemrosesan tenggat anggota belum berhasil; akan dicoba lagi.',
      );
    } finally {
      this.processing = false;
    }
  }

  private async transaction<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(work, {
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
          timeout: 15000,
        });
      } catch (error) {
        // InnoDB deadlocks can surface through either Prisma's transaction or raw-query code.
        const e = error as {
          code?: string;
          meta?: {
            code?: string;
            driverAdapterError?: { cause?: { originalCode?: string } };
          };
        };
        const deadlock =
          e.code === 'P2034' ||
          (e.code === 'P2010' &&
            ['1213', '1205'].includes(String(e.meta?.code))) ||
          ['1213', '1205'].includes(
            String(e.meta?.driverAdapterError?.cause?.originalCode),
          );
        if (!deadlock || attempt >= 2) throw error;
      }
    }
  }

  private async event(
    tx: Tx,
    userId: number,
    key: string,
    title: string,
    message: string,
    href: string,
    reminder = false,
  ) {
    await tx.notification.createMany({
      data: [
        {
          userId,
          eventKey: key,
          title,
          message,
          href,
          emailDelivery: reminder ? 'PENDING' : 'NOT_REQUIRED',
          whatsappDelivery: reminder ? 'MANUAL' : 'NOT_REQUIRED',
        },
      ],
      skipDuplicates: true,
    });
  }

  private reservationView(
    row: Prisma.ReservationGetPayload<{ include: typeof circulationInclude }>,
  ) {
    return {
      id: row.id,
      status: row.status,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      pickupLocation: this.config?.get<string>('PICKUP_LOCATION')?.trim() || serviceInfo.pickupLocation,
      book: row.book,
      copy: row.copy,
    };
  }
  private loanView(
    row: Prisma.LoanGetPayload<{ include: typeof circulationInclude }>,
  ) {
    return {
      id: row.id,
      status: row.status,
      borrowedAt: row.borrowedAt,
      dueAt: row.dueAt,
      returnedAt: row.returnedAt,
      extensionCount: row.extensionCount,
      book: row.book,
      copy: row.copy,
    };
  }

  private async invalidateReminders(tx: Tx, userId: number, loanId: number) {
    const where = { userId, eventKey: { startsWith: `loan:${loanId}:due:` } };
    await tx.notification.updateMany({
      where: { ...where, emailDelivery: { in: ['PENDING', 'FAILED'] } },
      data: { emailDelivery: 'NOT_REQUIRED' },
    });
    await tx.notification.updateMany({
      where: { ...where, whatsappDelivery: 'MANUAL' },
      data: { whatsappDelivery: 'NOT_REQUIRED' },
    });
  }

  async profile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        memberType: true,
        emailVerified: true,
        memberProfile: {
          select: {
            whatsapp: true,
            address: true,
            identityNumber: true,
            universityName: true,
            workUnit: true,
          },
        },
      },
    });
    if (!user) throw new NotFoundException('Anggota tidak ditemukan.');
    const { memberProfile, ...identity } = user;
    return {
      profile: {
        ...identity,
        whatsapp: memberProfile?.whatsapp ?? '',
        address: memberProfile?.address ?? '',
        identityNumber: memberProfile?.identityNumber ?? '',
        universityName: memberProfile?.universityName ?? null,
        workUnit: memberProfile?.workUnit ?? null,
      },
    };
  }

  async updateProfile(userId: number, body: unknown) {
    await this.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: userId },
        include: { memberProfile: true },
      });
      if (!user) throw new NotFoundException('Anggota tidak ditemukan.');
      const input = profileInput(body, user.memberType);
      const { name, ...profile } = input;
      if (name) await tx.user.update({ where: { id: userId }, data: { name } });
      if (Object.keys(profile).length) {
        if (!user.memberProfile && (!profile.whatsapp || !profile.address))
          throw new BadRequestException(
            'Nomor WhatsApp dan alamat wajib diisi.',
          );
        await tx.memberProfile.upsert({
          where: { userId },
          update: profile,
          create: {
            userId,
            whatsapp: profile.whatsapp ?? '',
            address: profile.address ?? '',
            identityNumber: '',
            universityName: profile.universityName,
            workUnit: profile.workUnit,
          },
        });
      }
    });
    return this.profile(userId);
  }

  async reservations(userId: number) {
    await this.expireReservations();
    const rows = await this.prisma.reservation.findMany({
      where: { userId },
      include: circulationInclude,
      orderBy: { createdAt: 'desc' },
    });
    return { reservations: rows.map((row) => this.reservationView(row)) };
  }

  async reserve(userId: number, body: unknown) {
    const bookId = bookInput(body);
    await this.expireReservations();
    const row = await this.transaction(async (tx) => {
      // User lock serializes duplicate requests even when a book has multiple copies.
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const member = await tx.memberProfile.findUnique({
        where: { userId },
        select: { whatsapp: true },
      });
      if (!member?.whatsapp)
        throw new BadRequestException(
          'Lengkapi nomor WhatsApp pada profil Anda terlebih dahulu.',
        );
      await tx.$queryRaw`SELECT id FROM books WHERE id = ${bookId} FOR UPDATE`;
      const book = await tx.book.findUnique({ where: { id: bookId } });
      if (!book || book.type !== 'FISIK')
        throw new BadRequestException(
          'Reservasi hanya tersedia untuk buku fisik.',
        );
      const duplicate = await tx.reservation.findFirst({
        where: { userId, bookId, status: 'MENUNGGU_PENGAMBILAN' },
      });
      if (duplicate)
        throw new ConflictException(
          'Anda masih memiliki reservasi aktif untuk buku ini.',
        );
      const available = await tx.$queryRaw<
        { id: number }[]
      >`SELECT id FROM book_copies WHERE bookId = ${bookId} AND status = 'TERSEDIA' ORDER BY id LIMIT 1 FOR UPDATE`;
      if (!available.length)
        throw new ConflictException('Buku sedang tidak tersedia.');
      const allocation = await tx.bookCopy.updateMany({
        where: { id: available[0].id, status: 'TERSEDIA' },
        data: { status: 'DIRESERVASI' },
      });
      if (!allocation.count)
        throw new ConflictException('Buku sedang tidak tersedia.');
      const now = new Date();
      const reservation = await tx.reservation.create({
        data: {
          userId,
          bookId,
          copyId: available[0].id,
          createdAt: now,
          expiresAt: new Date(now.getTime() + DAY),
        },
        include: circulationInclude,
      });
      await this.event(
        tx,
        userId,
        `reservation:${reservation.id}:created`,
        'Reservasi berhasil dibuat',
        `${book.title} telah direservasi. Ambil buku dalam 24 jam sebelum batas pengambilan.`,
        '/dashboard/reservasi',
      );
      return reservation;
    });
    return { reservation: this.reservationView(row) };
  }

  private async expireOne(tx: Tx, id: number, now: Date) {
    await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${id} FOR UPDATE`;
    const row = await tx.reservation.findUnique({
      where: { id },
      include: { book: { select: { title: true } } },
    });
    if (!row || row.status !== 'MENUNGGU_PENGAMBILAN' || row.expiresAt > now)
      return;
    const changed = await tx.reservation.updateMany({
      where: { id, status: 'MENUNGGU_PENGAMBILAN', expiresAt: { lte: now } },
      data: { status: 'KEDALUWARSA' },
    });
    if (!changed.count) return;
    await tx.bookCopy.updateMany({
      where: { id: row.copyId, status: 'DIRESERVASI' },
      data: { status: 'TERSEDIA' },
    });
    await this.event(
      tx,
      row.userId,
      `reservation:${id}:expired`,
      'Reservasi kedaluwarsa',
      `Batas pengambilan ${row.book.title} telah berakhir. Eksemplar dilepas kembali; silakan ajukan reservasi baru jika masih tersedia.`,
      '/dashboard/reservasi',
    );
  }

  async expireReservations() {
    const now = new Date();
    const expired = await this.prisma.reservation.findMany({
      where: { status: 'MENUNGGU_PENGAMBILAN', expiresAt: { lte: now } },
      select: { id: true },
    });
    for (const row of expired)
      await this.transaction((tx) => this.expireOne(tx, row.id, now));
  }

  async cancel(userId: number, id: number) {
    const row = await this.transaction(async (tx) => {
      // Scope the lock as well as the read to avoid touching another member's rows.
      await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${id} AND userId = ${userId} FOR UPDATE`;
      const row = await tx.reservation.findFirst({
        where: { id, userId },
        include: circulationInclude,
      });
      if (!row) throw new NotFoundException('Reservasi tidak ditemukan.');
      if (row.status !== 'MENUNGGU_PENGAMBILAN')
        throw new ConflictException('Reservasi ini sudah selesai.');
      const now = new Date();
      if (row.expiresAt <= now) {
        await this.expireOne(tx, id, now);
        return null;
      }
      await tx.reservation.update({
        where: { id },
        data: { status: 'DIBATALKAN', cancelledAt: now },
      });
      await tx.bookCopy.updateMany({
        where: { id: row.copyId, status: 'DIRESERVASI' },
        data: { status: 'TERSEDIA' },
      });
      await this.event(
        tx,
        userId,
        `reservation:${id}:cancelled`,
        'Reservasi dibatalkan',
        `Reservasi ${row.book.title} telah dibatalkan.`,
        '/dashboard/reservasi',
      );
      return { ...row, status: 'DIBATALKAN' as const };
    });
    if (!row) throw new ConflictException('Reservasi telah kedaluwarsa.');
    return { reservation: this.reservationView(row) };
  }

  async pickup(id: number) {
    const loan = await this.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${id} FOR UPDATE`;
      const reservation = await tx.reservation.findUnique({
        where: { id },
        include: circulationInclude,
      });
      if (!reservation)
        throw new NotFoundException('Reservasi tidak ditemukan.');
      if (reservation.status !== 'MENUNGGU_PENGAMBILAN')
        throw new ConflictException('Reservasi ini sudah selesai.');
      const now = new Date();
      if (reservation.expiresAt <= now) {
        await this.expireOne(tx, id, now);
        return null;
      }
      const copy = await tx.bookCopy.updateMany({
        where: { id: reservation.copyId, status: 'DIRESERVASI' },
        data: { status: 'DIPINJAM' },
      });
      if (!copy.count)
        throw new ConflictException('Status eksemplar sudah berubah.');
      await tx.reservation.update({
        where: { id },
        data: { status: 'DIAMBIL', pickedUpAt: now },
      });
      const loan = await tx.loan.create({
        data: {
          userId: reservation.userId,
          bookId: reservation.bookId,
          copyId: reservation.copyId,
          reservationId: id,
          borrowedAt: now,
          dueAt: new Date(now.getTime() + 7 * DAY),
        },
        include: circulationInclude,
      });
      await this.event(
        tx,
        reservation.userId,
        `loan:${loan.id}:pickup`,
        'Buku sudah diambil',
        `${reservation.book.title} telah dikonfirmasi diambil petugas. Masa pinjaman dimulai sekarang selama 7 hari.`,
        '/dashboard/pinjaman',
      );
      return loan;
    });
    if (!loan) throw new ConflictException('Reservasi telah kedaluwarsa.');
    return { loan: this.loanView(loan) };
  }

  async loans(userId: number, history = false) {
    const rows = await this.prisma.loan.findMany({
      where: { userId, ...(history ? {} : { status: 'AKTIF' }) },
      include: circulationInclude,
      orderBy: history ? { borrowedAt: 'desc' } : { dueAt: 'asc' },
    });
    return { loans: rows.map((row) => this.loanView(row)) };
  }

  async extend(userId: number, id: number) {
    const row = await this.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM loans WHERE id = ${id} AND userId = ${userId} FOR UPDATE`;
      const loan = await tx.loan.findFirst({
        where: { id, userId },
        include: circulationInclude,
      });
      if (!loan) throw new NotFoundException('Pinjaman tidak ditemukan.');
      if (loan.status !== 'AKTIF')
        throw new ConflictException(
          'Hanya pinjaman aktif yang dapat diperpanjang.',
        );
      const dueAt = new Date(loan.dueAt.getTime() + 7 * DAY);
      const extended = await tx.loan.update({
        where: { id },
        data: { dueAt, extensionCount: { increment: 1 } },
        include: circulationInclude,
      });
      const extension = await tx.loanExtension.create({
        data: { loanId: id, previousDueAt: loan.dueAt, newDueAt: dueAt },
      });
      await this.event(
        tx,
        userId,
        `extension:${extension.id}`,
        'Perpanjangan berhasil',
        `Jatuh tempo ${loan.book.title} ditambah 7 hari dari tenggat sebelumnya.`,
        '/dashboard/pinjaman',
      );
      // Queued reminders for the old deadline no longer apply after extension.
      await this.invalidateReminders(tx, userId, id);
      return extended;
    });
    return { loan: this.loanView(row) };
  }

  async finishLoan(id: number, lost: boolean) {
    const row = await this.transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM loans WHERE id = ${id} FOR UPDATE`;
      const loan = await tx.loan.findUnique({
        where: { id },
        include: circulationInclude,
      });
      if (!loan) throw new NotFoundException('Pinjaman tidak ditemukan.');
      if (loan.status !== 'AKTIF')
        throw new ConflictException('Pinjaman ini sudah selesai.');
      const copy = await tx.bookCopy.updateMany({
        where: { id: loan.copyId, status: 'DIPINJAM' },
        data: { status: lost ? 'HILANG' : 'TERSEDIA' },
      });
      if (!copy.count)
        throw new ConflictException('Status eksemplar sudah berubah.');
      const finished = await tx.loan.update({
        where: { id },
        data: {
          status: lost ? 'HILANG' : 'DIKEMBALIKAN',
          returnedAt: lost ? null : new Date(),
        },
        include: circulationInclude,
      });
      await this.event(
        tx,
        loan.userId,
        `loan:${id}:${lost ? 'lost' : 'returned'}`,
        lost ? 'Buku dinyatakan hilang' : 'Pengembalian berhasil',
        lost
          ? `${loan.book.title} dinyatakan hilang. Silakan menghubungi petugas perpustakaan untuk penanganan sesuai kebijakan perpustakaan.`
          : `${loan.book.title} telah dikonfirmasi dikembalikan petugas. Terima kasih.`,
        '/dashboard/riwayat',
      );
      await this.invalidateReminders(tx, loan.userId, id);
      return finished;
    });
    return { loan: this.loanView(row) };
  }

  async notifications(userId: number) {
    await this.expireReservations();
    await this.createReminders();
    return {
      notifications: await this.prisma.notification.findMany({
        where: { userId },
        select: notificationSelect,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      }),
    };
  }
  async readAll(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }
  async read(userId: number, id: number) {
    const notice = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true },
    });
    if (!notice) throw new NotFoundException('Notifikasi tidak ditemukan.');
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { success: true };
  }

  async ebooks(userId: number) {
    const rows = await this.prisma.userEBook.findMany({
      where: { userId },
      include: { book: { select: bookSelect } },
      orderBy: { addedAt: 'desc' },
    });
    return {
      ebooks: rows.map(({ id, book, addedAt, lastOpenedAt }) => ({
        id,
        book,
        addedAt,
        lastOpenedAt,
      })),
    };
  }
  async addEBook(userId: number, body: unknown) {
    const bookId = bookInput(body);
    const book = await this.prisma.book.findFirst({
      where: { id: bookId, type: 'EBOOK' },
      select: { id: true },
    });
    if (!book) throw new NotFoundException('E-Book tidak ditemukan.');
    // Native unique key plus upsert makes repeated saves idempotent.
    await this.prisma.userEBook.createMany({
      data: [{ userId, bookId }],
      skipDuplicates: true,
    });
    return { success: true };
  }
  async openEBook(userId: number, bookId: number) {
    await this.addEBook(userId, { bookId });
    await this.prisma.userEBook.update({
      where: { userId_bookId: { userId, bookId } },
      data: { lastOpenedAt: new Date() },
    });
    return { success: true };
  }

  async createReminders(now = new Date()) {
    const reservations = await this.prisma.reservation.findMany({
      where: {
        status: 'MENUNGGU_PENGAMBILAN',
        expiresAt: { gt: now, lte: new Date(now.getTime() + 2 * 3600000) },
      },
      include: { book: { select: { title: true } } },
    });
    for (const row of reservations)
      await this.transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM reservations WHERE id = ${row.id} FOR UPDATE`;
        const current = await tx.reservation.findUnique({
          where: { id: row.id },
        });
        if (
          !current ||
          current.status !== 'MENUNGGU_PENGAMBILAN' ||
          current.expiresAt <= now
        )
          return;
        await this.event(
          tx,
          row.userId,
          `reservation:${row.id}:almost`,
          'Reservasi hampir berakhir',
          `Batas pengambilan ${row.book.title} kurang dari 2 jam lagi. Segera ambil buku sebelum reservasi kedaluwarsa.`,
          '/dashboard/reservasi',
        );
      });
    const loans = await this.prisma.loan.findMany({
      where: { status: 'AKTIF' },
      include: { book: { select: { title: true } } },
    });
    for (const loan of loans) {
      const milestone = reminderMilestone(loan.dueAt, now);
      if (milestone === null) continue;
      // Lock and re-read so an extension/return cannot create a stale reminder.
      await this.transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM loans WHERE id = ${loan.id} FOR UPDATE`;
        const current = await tx.loan.findUnique({ where: { id: loan.id } });
        if (
          !current ||
          current.status !== 'AKTIF' ||
          current.dueAt.getTime() !== loan.dueAt.getTime()
        )
          return;
        const title =
          milestone === -1
            ? 'Jatuh tempo besok'
            : milestone === 0
              ? 'Jatuh tempo hari ini'
              : 'Pengingat pinjaman terlambat';
        const due = new Intl.DateTimeFormat('id-ID', {
          timeZone: 'Asia/Jakarta',
          dateStyle: 'long',
          timeStyle: 'short',
        }).format(loan.dueAt);
        const message = `${loan.book.title} ${milestone === -1 ? 'jatuh tempo besok' : milestone === 0 ? 'jatuh tempo hari ini' : `telah terlambat ${milestone} hari`}. Batas pengembalian: ${due} WIB. Tidak ada denda; mohon segera dikembalikan atau periksa perpanjangan pada Pinjaman Saya.`;
        await this.event(
          tx,
          loan.userId,
          `loan:${loan.id}:due:${loan.dueAt.getTime()}:${milestone}`,
          title,
          message,
          '/dashboard/pinjaman',
          true,
        );
      });
    }
  }

  private async deliverReminders() {
    if (!this.mail.isConfigured()) return;
    const retryBefore = new Date(Date.now() - 15 * 60000);
    await this.prisma.notification.updateMany({
      where: {
        emailDelivery: 'SENDING',
        emailAttempts: { gte: 5 },
        emailAttemptedAt: { lt: retryBefore },
      },
      data: { emailDelivery: 'FAILED' },
    });
    const pending = await this.prisma.notification.findMany({
      where: {
        emailAttempts: { lt: 5 },
        OR: [
          { emailDelivery: 'PENDING' },
          { emailDelivery: 'FAILED', emailAttemptedAt: { lt: retryBefore } },
          { emailDelivery: 'SENDING', emailAttemptedAt: { lt: retryBefore } },
        ],
      },
      include: { user: { select: { email: true } } },
      take: 20,
      orderBy: { id: 'asc' },
    });
    for (const notice of pending) {
      const event = /^loan:(\d+):due:(\d+):(-?\d+)$/.exec(notice.eventKey);
      if (!event) continue;
      const loanId = Number(event[1]);
      const deadline = Number(event[2]);
      // Claim under the same loan lock used by extensions and returns. The attempt
      // timestamp is the lease; stale SENDING claims recover after 15 minutes.
      const claimed = await this.transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM loans WHERE id = ${loanId} FOR UPDATE`;
        const loan = await tx.loan.findUnique({
          where: { id: loanId },
          select: { status: true, dueAt: true },
        });
        if (
          !loan ||
          loan.status !== 'AKTIF' ||
          loan.dueAt.getTime() !== deadline ||
          reminderMilestone(loan.dueAt, new Date()) !== Number(event[3])
        ) {
          await tx.notification.updateMany({
            where: {
              id: notice.id,
              emailDelivery: notice.emailDelivery,
              emailAttemptedAt: notice.emailAttemptedAt,
            },
            data: {
              emailDelivery: 'NOT_REQUIRED',
              whatsappDelivery: 'NOT_REQUIRED',
            },
          });
          return false;
        }
        const claim = await tx.notification.updateMany({
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
        return claim.count > 0;
      });
      if (!claimed) continue;
      const current = await this.prisma.loan.findUnique({
        where: { id: loanId },
        select: { status: true, dueAt: true },
      });
      if (
        !current ||
        current.status !== 'AKTIF' ||
        current.dueAt.getTime() !== deadline ||
        reminderMilestone(current.dueAt, new Date()) !== Number(event[3])
      ) {
        await this.prisma.notification.update({
          where: { id: notice.id },
          data: {
            emailDelivery: 'NOT_REQUIRED',
            whatsappDelivery: 'NOT_REQUIRED',
          },
        });
        continue;
      }
      let sent = false;
      try {
        sent = await this.mail.sendMemberReminder(
          notice.user.email,
          notice.title,
          notice.message,
        );
      } catch {
        /* SMTP failures are persisted without sensitive logs. */
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

  async dashboard(userId: number) {
    await this.expireReservations();
    await this.createReminders();
    const [{ profile }, reservations, loans, lost, ebooks, history, unread] =
      await Promise.all([
        this.profile(userId),
        this.prisma.reservation.findMany({
          where: { userId, status: 'MENUNGGU_PENGAMBILAN' },
          include: circulationInclude,
          orderBy: { expiresAt: 'asc' },
        }),
        this.prisma.loan.findMany({
          where: { userId, status: 'AKTIF' },
          include: circulationInclude,
          orderBy: { dueAt: 'asc' },
        }),
        this.prisma.loan.findMany({
          where: { userId, status: 'HILANG' },
          include: circulationInclude,
        }),
        this.prisma.userEBook.count({ where: { userId } }),
        this.prisma.loan.count({ where: { userId } }),
        this.prisma.notification.count({ where: { userId, readAt: null } }),
      ]);
    const now = new Date();
    return {
      currentUser: profile,
      stats: {
        waitingPickup: reservations.length,
        activeLoans: loans.length,
        dueTomorrow: loans.filter(
          (loan) => jakartaDay(loan.dueAt) === jakartaDay(now) + 1,
        ).length,
        ebooks,
        history,
      },
      activeReservations: reservations.map((row) => this.reservationView(row)),
      nearestDeadlines: loans.slice(0, 4).map((row) => this.loanView(row)),
      alerts: {
        overdue: loans
          .filter((loan) => loan.dueAt < now)
          .map((row) => this.loanView(row)),
        lost: lost.map((row) => this.loanView(row)),
      },
      unreadNotifications: unread,
      reminders: {
        email: this.mail.isConfigured()
          ? 'Email pengingat otomatis aktif: H-1, hari jatuh tempo, H+1, lalu setiap 2 hari.'
          : 'Email pengingat menunggu konfigurasi SMTP; jadwal tetap tercatat.',
        whatsapp:
          'WhatsApp belum terintegrasi otomatis. Pengingat tercatat untuk tindak lanjut manual petugas; nomor WhatsApp wajib.',
      },
    };
  }
}
