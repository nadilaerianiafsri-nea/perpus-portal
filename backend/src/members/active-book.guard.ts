import {
  CanActivate,
  ConflictException,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { bookInput, positiveId } from './member.validation';
import { isEBookAccessActive, sameBookTitle } from './active-book-title';

@Injectable()
export class ActiveBookGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      body?: unknown;
      params?: { bookId?: unknown };
      user?: { sub?: number };
    }>();

    const bookId =
      request.params?.bookId !== undefined
        ? positiveId(request.params.bookId)
        : bookInput(request.body);

    const book = await this.prisma.book.findUnique({
      where: { id: bookId },
      select: { type: true, isActive: true, title: true },
    });

    if (book && !book.isActive) {
      throw new ConflictException(
        book.type === 'EBOOK'
          ? 'E-Book sedang dinonaktifkan dan tidak dapat diakses.'
          : 'Buku sedang dinonaktifkan dan tidak dapat direservasi.',
      );
    }

    const userId = request.user?.sub;
    if (!book || !userId) return true;

    const now = new Date();

    // Check on the backend, not only by disabling the button in the frontend.
    // Unresolved lost reports (including those still awaiting verification)
    // and overdue physical loans block new physical and E-Book borrowing.
    const restrictedLoan = await this.prisma.loan.findFirst({
      where: {
        userId,
        OR: [
          { status: 'AKTIF', dueAt: { lt: now } },
          { status: 'HILANG', lostResolvedAt: null },
          { status: 'AKTIF', lostReportStatus: { not: null }, lostResolvedAt: null },
        ],
      },
      select: { status: true, dueAt: true, lostReportStatus: true },
      orderBy: { dueAt: 'asc' },
    });
    if (restrictedLoan) {
      const lost = restrictedLoan.status === 'HILANG' || restrictedLoan.lostReportStatus !== null;
      throw new ConflictException({
        statusCode: 409,
        code: lost ? 'UNRESOLVED_LOST_BOOK' : 'OVERDUE_LOAN',
        message: lost
          ? 'Selesaikan laporan atau penggantian buku hilang bersama petugas sebelum meminjam atau mereservasi buku baru.'
          : 'Anda masih memiliki pinjaman yang terlambat dikembalikan. Selesaikan pengembalian terlebih dahulu.',
      });
    }

    const [reservations, loans, ebooks] = await Promise.all([
      this.prisma.reservation.findMany({
        where: {
          userId,
          status: 'MENUNGGU_PENGAMBILAN',
          expiresAt: { gt: now },
        },
        select: {
          book: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.loan.findMany({
        where: {
          userId,
          status: 'AKTIF',
        },
        select: {
          book: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      }),
      this.prisma.userEBook.findMany({
        where: { userId },
        select: {
          bookId: true,
          addedAt: true,
          book: {
            select: {
              title: true,
              accessDurationDays: true,
            },
          },
        },
      }),
    ]);

    const reservationConflict = reservations.some((row) =>
      sameBookTitle(row.book.title, book.title),
    );
    const loanConflict = loans.some((row) =>
      sameBookTitle(row.book.title, book.title),
    );

    const ebookConflict = ebooks.some(
      (row) =>
        row.bookId !== bookId &&
        sameBookTitle(row.book.title, book.title) &&
        isEBookAccessActive(row.addedAt, row.book.accessDurationDays, now),
    );

    if (reservationConflict || loanConflict || ebookConflict) {
      throw new ConflictException({
        statusCode: 409,
        code: reservationConflict
          ? 'ACTIVE_RESERVATION'
          : loanConflict
            ? 'ACTIVE_LOAN'
            : 'ACTIVE_EBOOK',
        message: `Anda masih memiliki akses aktif untuk “${book.title}”. Selesaikan reservasi, pinjaman, atau masa akses E-Book sebelum mengambil judul yang sama lagi.`,
      });
    }

    return true;
  }
}
