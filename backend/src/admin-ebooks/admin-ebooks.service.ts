import { textInputError } from '../../../shared/inputValidation.cjs';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  parseAdminEBookInput,
  positiveEBookId,
  type AdminEBookInput,
} from './admin-ebooks.input';

type AdminEBooksQuery = Record<string, unknown>;

function queryText(value: unknown, label: string, max = 191): string {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string') {
    throw new BadRequestException(`${label} tidak valid.`);
  }
  const error = textInputError(value, { max });
  if (error) throw new BadRequestException(error);
  const result = value.trim();
  if (result.length > max) {
    throw new BadRequestException(`${label} terlalu panjang.`);
  }
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

function parseInput(body: unknown): AdminEBookInput {
  try {
    return parseAdminEBookInput(body);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'Data E-Book tidak valid.',
    );
  }
}

function parseId(id: string): number {
  try {
    return positiveEBookId(id);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'ID E-Book tidak valid.',
    );
  }
}

function pageMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}

@Injectable()
export class AdminEBooksService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminEBooksQuery) {
    if (Object.keys(query).some((key) => !['search', 'status', 'page', 'limit'].includes(key))) {
      throw new BadRequestException('Parameter tidak diizinkan.');
    }
    const search = queryText(query.search, 'Pencarian');
    const status = queryText(query.status, 'Status', 16).toUpperCase() || 'ALL';
    const page = queryInteger(query.page, 1, 1, 100000);
    const limit = queryInteger(query.limit, 20, 1, 100);

    if (!['ALL', 'ACTIVE', 'INACTIVE'].includes(status)) {
      throw new BadRequestException('Status tidak valid.');
    }

    const where: Prisma.BookWhereInput = {
      type: 'EBOOK',
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

    const baseWhere: Prisma.BookWhereInput = { type: 'EBOOK' };
    const [totalEBooks, activeEBooks, inactiveEBooks, total, books] =
      await this.prisma.$transaction([
        this.prisma.book.count({ where: baseWhere }),
        this.prisma.book.count({ where: { ...baseWhere, isActive: true } }),
        this.prisma.book.count({ where: { ...baseWhere, isActive: false } }),
        this.prisma.book.count({ where }),
        this.prisma.book.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

    return {
      stats: {
        total: totalEBooks,
        active: activeEBooks,
        inactive: inactiveEBooks,
      },
      data: books.map((book) => ({
        id: book.id,
        code: book.code,
        title: book.title,
        author: book.author,
        publisher: book.publisher,
        year: book.year,
        coverUrl: book.coverUrl,
        accessMode: book.accessMode ?? (book.ebookUrl ? 'BACA_DI_WEBSITE' : 'TIDAK_TERSEDIA'),
        isActive: book.isActive,
      })),
      meta: pageMeta(page, limit, total),
    };
  }

  async circulation(query: AdminEBooksQuery) {
    if (
      Object.keys(query).some(
        (key) => !['section', 'search', 'page', 'limit'].includes(key),
      )
    )
      throw new BadRequestException('Parameter tidak diizinkan.');

    const section =
      queryText(query.section, 'Bagian', 16).toUpperCase() || 'ALL';
    if (!['ALL', 'ACTIVE', 'QUEUE', 'HISTORY'].includes(section))
      throw new BadRequestException('Bagian monitoring tidak valid.');
    const search = queryText(query.search, 'Pencarian', 100);
    const page = queryInteger(query.page, 1, 1, 100000);
    const limit = queryInteger(query.limit, 30, 1, 100);
    const skip = (page - 1) * limit;
    void section;

    const loanSearch: Prisma.EBookLoanWhereInput = search
      ? {
          OR: [
            { book: { title: { contains: search } } },
            { book: { code: { contains: search } } },
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
          ],
        }
      : {};
    const queueSearch: Prisma.EBookQueueWhereInput = search
      ? {
          OR: [
            { book: { title: { contains: search } } },
            { book: { code: { contains: search } } },
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
          ],
        }
      : {};

    const includeLoan = {
      user: { select: { id: true, name: true, email: true } },
      book: { select: { id: true, title: true, code: true, coverUrl: true } },
    } as const;
    const includeQueue = {
      user: { select: { id: true, name: true, email: true } },
      book: { select: { id: true, title: true, code: true, coverUrl: true } },
    } as const;

    const activeWhere: Prisma.EBookLoanWhereInput = {
      status: 'AKTIF',
      ...loanSearch,
    };
    const historyWhere: Prisma.EBookLoanWhereInput = {
      status: { in: ['DIKEMBALIKAN', 'KEDALUWARSA'] },
      ...loanSearch,
    };
    const queueWhere: Prisma.EBookQueueWhereInput = {
      status: { in: ['MENUNGGU', 'DITAWARKAN'] },
      ...queueSearch,
    };

    const [activeTotal, activeRows, queueTotal, queueRows, historyTotal, historyRows] =
      await Promise.all([
        this.prisma.eBookLoan.count({ where: activeWhere }),
        this.prisma.eBookLoan.findMany({
          where: activeWhere,
          include: includeLoan,
          orderBy: [{ dueAt: 'asc' }, { id: 'asc' }],
          skip,
          take: limit,
        }),
        this.prisma.eBookQueue.count({ where: queueWhere }),
        this.prisma.eBookQueue.findMany({
          where: queueWhere,
          include: includeQueue,
          orderBy: [{ bookId: 'asc' }, { queuedAt: 'asc' }, { id: 'asc' }],
          skip,
          take: limit,
        }),
        this.prisma.eBookLoan.count({ where: historyWhere }),
        this.prisma.eBookLoan.findMany({
          where: historyWhere,
          include: includeLoan,
          orderBy: [{ endedAt: 'desc' }, { id: 'desc' }],
          skip,
          take: limit,
        }),
      ]);

    const queueBookIds = [...new Set(queueRows.map((row) => row.bookId))];
    const orderedQueue = queueBookIds.length
      ? await this.prisma.eBookQueue.findMany({
          where: {
            bookId: { in: queueBookIds },
            status: { in: ['MENUNGGU', 'DITAWARKAN'] },
          },
          select: { id: true, bookId: true },
          orderBy: [{ bookId: 'asc' }, { queuedAt: 'asc' }, { id: 'asc' }],
        })
      : [];
    const queuePositions = new Map<number, number>();
    const counts = new Map<number, number>();
    for (const row of orderedQueue) {
      const position = (counts.get(row.bookId) ?? 0) + 1;
      counts.set(row.bookId, position);
      queuePositions.set(row.id, position);
    }

    return {
      activeLoans: {
        data: activeRows.map((row) => ({
          id: row.id,
          status: row.status,
          borrowedAt: row.borrowedAt,
          dueAt: row.dueAt,
          user: row.user,
          book: row.book,
        })),
        meta: pageMeta(page, limit, activeTotal),
      },
      queues: {
        data: queueRows.map((row) => ({
          id: row.id,
          status: row.status,
          queuedAt: row.queuedAt,
          offeredAt: row.offeredAt,
          claimExpiresAt: row.claimExpiresAt,
          position: queuePositions.get(row.id) ?? null,
          user: row.user,
          book: row.book,
        })),
        meta: pageMeta(page, limit, queueTotal),
      },
      history: {
        data: historyRows.map((row) => ({
          id: row.id,
          status: row.status,
          borrowedAt: row.borrowedAt,
          dueAt: row.dueAt,
          endedAt: row.endedAt,
          user: row.user,
          book: row.book,
        })),
        meta: pageMeta(page, limit, historyTotal),
      },
    };
  }

  async detail(rawId: string) {
    const id = parseId(rawId);
    const book = await this.prisma.book.findFirst({
      where: { id, type: 'EBOOK' },
    });

    if (!book) throw new NotFoundException('E-Book tidak ditemukan.');

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
        accessMode: book.accessMode ?? (book.ebookUrl ? 'BACA_DI_WEBSITE' : 'TIDAK_TERSEDIA'),
        ebookUrl: book.ebookUrl,
        accessDurationDays: book.accessDurationDays,
        licenseNote: book.licenseNote,
        isActive: book.isActive,
        createdAt: book.createdAt,
        updatedAt: book.updatedAt,
      },
    };
  }

  async create(body: unknown) {
    const input = parseInput(body);

    try {
      const created = await this.prisma.book.create({
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
          type: 'EBOOK',
          format:
            input.accessMode === 'BACA_DI_WEBSITE' && input.ebookUrl?.toLowerCase().endsWith('.pdf')
              ? 'PDF'
              : input.accessMode === 'BACA_DI_WEBSITE'
                ? 'HTML'
                : 'Digital',
          description: input.description,
          coverUrl: input.coverUrl,
          shelf: null,
          ebookUrl: input.ebookUrl,
          accessMode: input.accessMode,
          accessDurationDays: input.accessDurationDays,
          licenseNote: input.licenseNote,
          isDemo: false,
          isActive: input.isActive,
        },
      });

      return this.detail(String(created.id));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Kode E-Book sudah digunakan.');
      }
      throw error;
    }
  }

  async update(rawId: string, body: unknown) {
    const id = parseId(rawId);
    const input = parseInput(body);

    const existing = await this.prisma.book.findFirst({
      where: { id, type: 'EBOOK' },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('E-Book tidak ditemukan.');

    try {
      await this.prisma.book.update({
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
          format:
            input.accessMode === 'BACA_DI_WEBSITE' && input.ebookUrl?.toLowerCase().endsWith('.pdf')
              ? 'PDF'
              : input.accessMode === 'BACA_DI_WEBSITE'
                ? 'HTML'
                : 'Digital',
          description: input.description,
          coverUrl: input.coverUrl,
          shelf: null,
          ebookUrl: input.ebookUrl,
          accessMode: input.accessMode,
          accessDurationDays: input.accessDurationDays,
          licenseNote: input.licenseNote,
          isActive: input.isActive,
        },
      });

      return this.detail(String(id));
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Kode E-Book sudah digunakan.');
      }
      throw error;
    }
  }

  async setStatus(rawId: string, body: unknown) {
    const id = parseId(rawId);
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Status E-Book tidak valid.');
    }

    if (Object.keys(body).some((key) => key !== 'isActive')) {
      throw new BadRequestException('Field status tidak diizinkan.');
    }
    const isActive = (body as Record<string, unknown>).isActive;
    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('Status E-Book tidak valid.');
    }

    const result = await this.prisma.book.updateMany({
      where: { id, type: 'EBOOK' },
      data: { isActive },
    });

    if (!result.count) throw new NotFoundException('E-Book tidak ditemukan.');
    return this.detail(String(id));
  }
}
