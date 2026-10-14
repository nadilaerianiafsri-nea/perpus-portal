import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, CollectionType, CopyStatus } from '../generated/prisma/client';
import { MembersService } from '../members/members.service';
import { textInputError } from '../../../shared/inputValidation.cjs';

type CatalogRow = {
  id: number;
  code: string;
  title: string;
  author: string;
  year: number;
  type: CollectionType;
  coverUrl: string;
  subject: string;
  language: string;
  isDemo: boolean | number;
  totalCopies: bigint | number;
  availableCopies: bigint | number;
  reservedCopies: bigint | number;
};

const available = Prisma.sql`EXISTS (SELECT 1 FROM book_copies c WHERE c.bookId = b.id AND c.status = 'TERSEDIA')`;
const reserved = Prisma.sql`EXISTS (SELECT 1 FROM book_copies c WHERE c.bookId = b.id AND c.status = 'DIRESERVASI')`;

function values(value: unknown): string[] {
  if (value === undefined || value === '') return [];
  const list = Array.isArray(value) ? value : [value];
  if (list.length > 20) {
    throw new BadRequestException('Parameter filter terlalu panjang.');
  }
  if (list.some((item) => typeof item !== 'string')) {
    throw new BadRequestException('Parameter filter tidak valid.');
  }
  for (const item of list) {
    const error = textInputError(item, { max: 4000 });
    if (error) throw new BadRequestException(error);
  }
  const result = list
    .flatMap((item) => (item as string).split(','))
    .map((item) => item.trim())
    .filter(Boolean);
  if (result.length > 20 || result.some((item) => item.length > 191)) {
    throw new BadRequestException('Parameter filter terlalu panjang.');
  }
  return [...new Set(result)];
}

function integer(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  if (value === undefined || value === '') return fallback;
  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value) ||
    Number(value) < min ||
    Number(value) > max
  ) {
    throw new BadRequestException('Parameter halaman atau tahun tidak valid.');
  }
  return Number(value);
}

function status(
  type: CollectionType,
  availableCount: number,
  reservedCount: number,
) {
  return type === CollectionType.EBOOK
    ? null
    : availableCount > 0
      ? 'TERSEDIA'
      : reservedCount > 0
        ? 'DIRESERVASI'
        : 'STOK_HABIS';
}

@Injectable()
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MembersService,
  ) {}

  private async newestActiveIds(ebooksOnly: boolean, take: number) {
    const rows = await this.prisma.book.findMany({
      where: {
        isActive: true,
        ...(ebooksOnly ? { type: CollectionType.EBOOK } : {}),
      },
      select: { id: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take,
    });
    return rows.map((row) => row.id);
  }

  async filters(ebooksOnly = false, newestLimit?: number) {
    const recentIds = newestLimit
      ? await this.newestActiveIds(ebooksOnly, newestLimit)
      : null;
    const where = {
      isActive: true,
      ...(ebooksOnly ? { type: CollectionType.EBOOK } : {}),
      ...(recentIds ? { id: { in: recentIds } } : {}),
    };

    const [subjects, languages, years] = await Promise.all([
      this.prisma.book.findMany({
        where,
        distinct: ['subject'],
        select: { subject: true },
        orderBy: { subject: 'asc' },
      }),
      this.prisma.book.findMany({
        where,
        distinct: ['language'],
        select: { language: true },
        orderBy: { language: 'asc' },
      }),
      this.prisma.book.findMany({
        where,
        distinct: ['year'],
        select: { year: true },
        orderBy: { year: 'desc' },
      }),
    ]);

    return {
      subjects: subjects.map((book) => book.subject),
      languages: languages.map((book) => book.language),
      years: years.map((book) => book.year),
    };
  }

  async list(
    query: Record<string, unknown>,
    ebooksOnly = false,
    newestLimit?: number,
  ) {
    const allowed = [
      'page',
      'limit',
      'yearFrom',
      'yearTo',
      'search',
      'type',
      'availability',
      'subject',
      'language',
      'sort',
    ];
    if (
      !query ||
      typeof query !== 'object' ||
      Array.isArray(query) ||
      Object.keys(query).some((key) => !allowed.includes(key))
    ) {
      throw new BadRequestException('Parameter tidak dikenal.');
    }

    const page = integer(query.page, 1, 1, 100000);
    const limit = integer(query.limit, ebooksOnly ? 8 : 20, 1, 40);
    const yearFrom = integer(query.yearFrom, 0, 0, 9999);
    const yearTo = integer(query.yearTo, 9999, 0, 9999);
    if (yearFrom > yearTo) {
      throw new BadRequestException('Rentang tahun tidak valid.');
    }
    if (query.search !== undefined && typeof query.search !== 'string') {
      throw new BadRequestException('Pencarian tidak valid.');
    }

    const search = (query.search as string | undefined)?.trim() ?? '';
    const searchError = textInputError(search, { max: 191, required: false });
    if (searchError) throw new BadRequestException(searchError);
    if (search.length > 191) {
      throw new BadRequestException('Pencarian terlalu panjang.');
    }

    const types = ebooksOnly ? ['EBOOK'] : values(query.type);
    if (ebooksOnly) values(query.type);
    const availabilities = values(query.availability);
    if (
      types.some((value) => !['FISIK', 'EBOOK'].includes(value)) ||
      availabilities.some(
        (value) =>
          !['TERSEDIA', 'DIRESERVASI', 'STOK_HABIS'].includes(value),
      )
    ) {
      throw new BadRequestException('Jenis atau ketersediaan tidak valid.');
    }

    const recentIds = newestLimit
      ? await this.newestActiveIds(ebooksOnly, newestLimit)
      : null;

    const clauses: Prisma.Sql[] = [
      Prisma.sql`b.isActive = 1`,
      Prisma.sql`b.year >= ${yearFrom} AND b.year <= ${yearTo}`,
    ];

    if (recentIds) {
      clauses.push(
        recentIds.length
          ? Prisma.sql`b.id IN (${Prisma.join(recentIds)})`
          : Prisma.sql`b.id = -1`,
      );
    }

    if (types.length) {
      clauses.push(Prisma.sql`b.type IN (${Prisma.join(types)})`);
    }

    for (const [field, selected] of [
      [Prisma.sql`b.subject`, values(query.subject)],
      [Prisma.sql`b.language`, values(query.language)],
    ] as const) {
      if (selected.length) {
        clauses.push(Prisma.sql`${field} IN (${Prisma.join(selected)})`);
      }
    }

    const escaped = search.replace(/[!%_]/g, (character) => `!${character}`);
    const pattern = `%${escaped}%`;
    if (search) {
      clauses.push(
        Prisma.sql`(b.title LIKE ${pattern} ESCAPE '!' OR b.author LIKE ${pattern} ESCAPE '!' OR b.subject LIKE ${pattern} ESCAPE '!' OR b.isbnIssn LIKE ${pattern} ESCAPE '!' OR b.code LIKE ${pattern} ESCAPE '!')`,
      );
    }

    if (availabilities.length && !ebooksOnly) {
      const conditions = availabilities.map((value) =>
        value === 'TERSEDIA'
          ? available
          : value === 'DIRESERVASI'
            ? Prisma.sql`NOT ${available} AND ${reserved}`
            : Prisma.sql`NOT ${available} AND NOT ${reserved}`,
      );
      clauses.push(
        Prisma.sql`b.type = 'FISIK' AND (${Prisma.join(
          conditions.map((condition) => Prisma.sql`(${condition})`),
          ' OR ',
        )})`,
      );
    }

    const where = Prisma.join(
      clauses.map((clause) => Prisma.sql`(${clause})`),
      ' AND ',
    );

    const orders: Record<string, Prisma.Sql> = {
      relevance: search
        ? Prisma.sql`CASE WHEN b.title = ${search} THEN 0 WHEN b.code = ${search} OR b.isbnIssn = ${search} THEN 1 WHEN b.title LIKE ${`${escaped}%`} ESCAPE '!' THEN 2 WHEN b.title LIKE ${pattern} ESCAPE '!' THEN 3 WHEN b.author LIKE ${pattern} ESCAPE '!' THEN 4 ELSE 5 END ASC, b.title ASC`
        : Prisma.sql`b.code ASC`,
      newest: Prisma.sql`b.createdAt DESC, b.id DESC`,
      titleAsc: Prisma.sql`b.title ASC`,
      titleDesc: Prisma.sql`b.title DESC`,
      yearDesc: Prisma.sql`b.year DESC`,
      yearAsc: Prisma.sql`b.year ASC`,
    };

    const sort = query.sort ?? 'relevance';
    if (typeof sort !== 'string' || !Object.hasOwn(orders, sort)) {
      throw new BadRequestException('Urutan tidak valid.');
    }

    if (!ebooksOnly) await this.members.expireReservations();

    const [count, rows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS total FROM books b WHERE ${where}`,
      ),
      this.prisma.$queryRaw<CatalogRow[]>(
        Prisma.sql`SELECT b.id, b.code, b.title, b.author, b.year, b.type, b.coverUrl, b.subject, b.language, b.isDemo,
          (SELECT COUNT(*) FROM book_copies c WHERE c.bookId=b.id) AS totalCopies,
          (SELECT COUNT(*) FROM book_copies c WHERE c.bookId=b.id AND c.status='TERSEDIA') AS availableCopies,
          (SELECT COUNT(*) FROM book_copies c WHERE c.bookId=b.id AND c.status='DIRESERVASI') AS reservedCopies
          FROM books b WHERE ${where} ORDER BY ${orders[sort]}, b.id ASC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      ),
    ]);

    const total = Number(count[0]?.total ?? 0);
    return {
      data: rows.map((row) => ({
        ...row,
        isDemo: !!row.isDemo,
        totalCopies: Number(row.totalCopies),
        availableCopies: Number(row.availableCopies),
        reservedCopies: Number(row.reservedCopies),
        availability: status(
          row.type,
          Number(row.availableCopies),
          Number(row.reservedCopies),
        ),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async detail(input: string) {
    if (
      typeof input !== 'string' ||
      input.length > 10 ||
      !/^\d+$/.test(input) ||
      !Number.isSafeInteger(Number(input)) ||
      Number(input) < 1 ||
      Number(input) > 2_147_483_647
    ) {
      throw new NotFoundException('Koleksi tidak ditemukan.');
    }

    await this.members.expireReservations();
    const book = await this.prisma.book.findFirst({
      where: { id: Number(input), isActive: true },
      include: { copies: { orderBy: { code: 'asc' } } },
    });
    if (!book) throw new NotFoundException('Koleksi tidak ditemukan.');

    const availableCopies = book.copies.filter(
      (copy) => copy.status === CopyStatus.TERSEDIA,
    ).length;
    const reservedCopies = book.copies.filter(
      (copy) => copy.status === CopyStatus.DIRESERVASI,
    ).length;

    return {
      ...book,
      totalCopies: book.copies.length,
      availableCopies,
      reservedCopies,
      availability: status(book.type, availableCopies, reservedCopies),
    };
  }
}
