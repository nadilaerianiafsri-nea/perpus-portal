import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  copyCode,
  parseAdminBookInput,
  planStockChange,
  positiveBookId,
  type AdminBookInput,
  type StockRow,
} from './admin-books.input';

type AdminBooksQuery = Record<string, unknown>;

function queryText(value: unknown, label: string, max = 191): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') throw new BadRequestException(`${label} tidak valid.`);
  const result = value.trim();
  if (result.length > max) throw new BadRequestException(`${label} terlalu panjang.`);
  return result;
}

function queryInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    throw new BadRequestException('Parameter halaman tidak valid.');
  }
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < min || result > max) {
    throw new BadRequestException('Parameter halaman tidak valid.');
  }
  return result;
}

function parseInput(body: unknown): AdminBookInput {
  try {
    return parseAdminBookInput(body);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Data buku tidak valid.',
    );
  }
}

function parseId(id: string): number {
  try {
    return positiveBookId(id);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'ID buku tidak valid.',
    );
  }
}

function stockPlan(rows: StockRow[], target: number) {
  try {
    return planStockChange(rows, target);
  } catch (error) {
    throw new ConflictException(
      error instanceof Error ? error.message : 'Jumlah stok tidak dapat diubah.',
    );
  }
}

@Injectable()
export class AdminBooksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminBooksQuery) {
    const search = queryText(query.search, 'Pencarian');
    const status = queryText(query.status, 'Status', 16).toUpperCase() || 'ALL';
    const page = queryInteger(query.page, 1, 1, 100000);
    const limit = queryInteger(query.limit, 20, 1, 100);

    if (!['ALL', 'ACTIVE', 'INACTIVE'].includes(status)) {
      throw new BadRequestException('Status tidak valid.');
    }

    const where: Prisma.BookWhereInput = {
      type: 'FISIK',
      ...(status === 'ACTIVE'
        ? { isActive: true }
        : status === 'INACTIVE'
          ? { isActive: false }
          : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search } },
              { author: { contains: search } },
              { code: { contains: search } },
              { isbnIssn: { contains: search } },
            ],
          }
        : {}),
    };

    const baseWhere: Prisma.BookWhereInput = { type: 'FISIK' };
    const [totalBooks, activeBooks, inactiveBooks, total, books] =
      await this.prisma.$transaction([
        this.prisma.book.count({ where: baseWhere }),
        this.prisma.book.count({ where: { ...baseWhere, isActive: true } }),
        this.prisma.book.count({ where: { ...baseWhere, isActive: false } }),
        this.prisma.book.count({ where }),
        this.prisma.book.findMany({
          where,
          include: {
            copies: { select: { status: true } },
          },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

    return {
      stats: {
        total: totalBooks,
        active: activeBooks,
        inactive: inactiveBooks,
      },
      data: books.map((book) => {
        const totalCopies = book.copies.length;
        const availableCopies = book.copies.filter(
          (copy) => copy.status === 'TERSEDIA',
        ).length;

        return {
          id: book.id,
          code: book.code,
          title: book.title,
          author: book.author,
          year: book.year,
          coverUrl: book.coverUrl,
          isActive: book.isActive,
          totalCopies,
          availableCopies,
          availability: availableCopies > 0 ? 'TERSEDIA' : 'STOK_HABIS',
        };
      }),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async detail(rawId: string) {
    const id = parseId(rawId);
    const book = await this.prisma.book.findFirst({
      where: { id, type: 'FISIK' },
      include: {
        copies: { orderBy: { id: 'asc' } },
        reservations: {
          where: { status: 'MENUNGGU_PENGAMBILAN' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            copy: { select: { code: true } },
          },
          orderBy: { expiresAt: 'asc' },
        },
        loans: {
          where: { status: 'AKTIF' },
          include: {
            user: { select: { id: true, name: true, email: true } },
            copy: { select: { code: true } },
          },
          orderBy: { dueAt: 'asc' },
        },
      },
    });

    if (!book) throw new NotFoundException('Buku tidak ditemukan.');

    const availableCopies = book.copies.filter(
      (copy) => copy.status === 'TERSEDIA',
    ).length;

    return {
      book: {
        id: book.id,
        code: book.code,
        title: book.title,
        author: book.author,
        isbnIssn: book.isbnIssn,
        publisher: book.publisher,
        year: book.year,
        edition: book.edition,
        language: book.language,
        subject: book.subject,
        description: book.description,
        coverUrl: book.coverUrl,
        shelf: book.shelf ?? '',
        location: book.copies[0]?.location ?? '',
        isActive: book.isActive,
        totalCopies: book.copies.length,
        availableCopies,
        copies: book.copies,
        transactions: [
          ...book.reservations.map((reservation) => ({
            id: `reservation-${reservation.id}`,
            code: `RSV-${reservation.id}`,
            type: 'RESERVASI' as const,
            status: reservation.status,
            deadline: reservation.expiresAt,
            member: reservation.user,
            copyCode: reservation.copy.code,
          })),
          ...book.loans.map((loan) => ({
            id: `loan-${loan.id}`,
            code: `TRX-${loan.id}`,
            type: 'PEMINJAMAN' as const,
            status: loan.status,
            deadline: loan.dueAt,
            member: loan.user,
            copyCode: loan.copy.code,
          })),
        ].sort(
          (a, b) =>
            a.deadline.getTime() - b.deadline.getTime(),
        ),
      },
    };
  }

  async create(body: unknown) {
    const input = parseInput(body);

    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const book = await tx.book.create({
          data: {
            code: input.code,
            title: input.title,
            author: input.author,
            isbnIssn: input.isbnIssn,
            publisher: input.publisher,
            year: input.year,
            edition: input.edition,
            language: input.language,
            subject: input.subject,
            type: 'FISIK',
            format: 'Buku cetak',
            description: input.description,
            coverUrl: input.coverUrl,
            shelf: input.shelf,
            ebookUrl: null,
            isDemo: false,
            isActive: input.isActive,
          },
        });

        if (input.totalStock > 0) {
          await tx.bookCopy.createMany({
            data: Array.from({ length: input.totalStock }, (_, index) => ({
              bookId: book.id,
              code: copyCode(input.code, index + 1),
              status: 'TERSEDIA' as const,
              location: input.location,
            })),
          });
        }

        return book;
      });

      return this.detail(String(created.id));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Kode Buku sudah digunakan.');
      }
      throw error;
    }
  }

  async update(rawId: string, body: unknown) {
    const id = parseId(rawId);
    const input = parseInput(body);

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM books WHERE id = ${id} FOR UPDATE`;
        const current = await tx.book.findFirst({
          where: { id, type: 'FISIK' },
          include: { copies: { orderBy: { id: 'asc' } } },
        });

        if (!current) throw new NotFoundException('Buku tidak ditemukan.');

        if (input.code !== current.code) {
          const duplicate = await tx.book.findUnique({
            where: { code: input.code },
            select: { id: true },
          });
          if (duplicate && duplicate.id !== id) {
            throw new ConflictException('Kode Buku sudah digunakan.');
          }
        }

        const plan = stockPlan(
          current.copies.map((copy) => ({
            id: copy.id,
            status: copy.status as StockRow['status'],
          })),
          input.totalStock,
        );

        if (plan.deleteIds.length) {
          await tx.bookCopy.deleteMany({
            where: {
              id: { in: plan.deleteIds },
              bookId: id,
              status: 'TERSEDIA',
            },
          });
        }

        const remaining = current.copies.filter(
          (copy) => !plan.deleteIds.includes(copy.id),
        );

        for (const [index, copy] of remaining.entries()) {
          await tx.bookCopy.update({
            where: { id: copy.id },
            data: {
              code: copyCode(input.code, index + 1),
              location: input.location,
            },
          });
        }

        if (plan.addCount > 0) {
          await tx.bookCopy.createMany({
            data: Array.from({ length: plan.addCount }, (_, index) => ({
              bookId: id,
              code: copyCode(input.code, remaining.length + index + 1),
              status: 'TERSEDIA' as const,
              location: input.location,
            })),
          });
        }

        await tx.book.update({
          where: { id },
          data: {
            code: input.code,
            title: input.title,
            author: input.author,
            isbnIssn: input.isbnIssn,
            publisher: input.publisher,
            year: input.year,
            edition: input.edition,
            language: input.language,
            subject: input.subject,
            format: 'Buku cetak',
            description: input.description,
            coverUrl: input.coverUrl,
            shelf: input.shelf,
            isActive: input.isActive,
          },
        });
      });

      return this.detail(String(id));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Kode Buku atau kode eksemplar sudah digunakan.');
      }
      throw error;
    }
  }

  async setStatus(rawId: string, body: unknown) {
    const id = parseId(rawId);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Status buku tidak valid.');
    }

    const isActive = (body as Record<string, unknown>).isActive;
    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('Status buku tidak valid.');
    }

    const result = await this.prisma.book.updateMany({
      where: { id, type: 'FISIK' },
      data: { isActive },
    });

    if (!result.count) throw new NotFoundException('Buku tidak ditemukan.');
    return this.detail(String(id));
  }
}
