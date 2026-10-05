import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, CollectionType, CopyStatus } from '../generated/prisma/client';

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
  if (list.some((v) => typeof v !== 'string'))
    throw new BadRequestException('Parameter filter tidak valid.');
  const result = list
    .flatMap((v) => (v as string).split(','))
    .map((v) => v.trim())
    .filter(Boolean);
  if (result.length > 20 || result.some((v) => v.length > 191))
    throw new BadRequestException('Parameter filter terlalu panjang.');
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
  )
    throw new BadRequestException('Parameter halaman atau tahun tidak valid.');
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
  constructor(private readonly prisma: PrismaService) {}

  async filters() {
    const [subjects, languages, years] = await Promise.all([
      this.prisma.book.findMany({
        distinct: ['subject'],
        select: { subject: true },
        orderBy: { subject: 'asc' },
      }),
      this.prisma.book.findMany({
        distinct: ['language'],
        select: { language: true },
        orderBy: { language: 'asc' },
      }),
      this.prisma.book.findMany({
        distinct: ['year'],
        select: { year: true },
        orderBy: { year: 'desc' },
      }),
    ]);
    return {
      subjects: subjects.map((b) => b.subject),
      languages: languages.map((b) => b.language),
      years: years.map((b) => b.year),
    };
  }

  async list(query: Record<string, unknown>, ebooksOnly = false) {
    const page = integer(query.page, 1, 1, 100000);
    const limit = integer(query.limit, ebooksOnly ? 8 : 20, 1, 40);
    const yearFrom = integer(query.yearFrom, 0, 0, 9999);
    const yearTo = integer(query.yearTo, 9999, 0, 9999);
    if (yearFrom > yearTo)
      throw new BadRequestException('Rentang tahun tidak valid.');
    if (query.search !== undefined && typeof query.search !== 'string')
      throw new BadRequestException('Pencarian tidak valid.');
    const search = (query.search as string | undefined)?.trim() ?? '';
    if (search.length > 191)
      throw new BadRequestException('Pencarian terlalu panjang.');
    const types = ebooksOnly ? ['EBOOK'] : values(query.type);
    const availabilities = values(query.availability);
    if (
      types.some((v) => !['FISIK', 'EBOOK'].includes(v)) ||
      availabilities.some(
        (v) => !['TERSEDIA', 'DIRESERVASI', 'STOK_HABIS'].includes(v),
      )
    )
      throw new BadRequestException('Jenis atau ketersediaan tidak valid.');
    const clauses: Prisma.Sql[] = [
      Prisma.sql`b.year >= ${yearFrom} AND b.year <= ${yearTo}`,
    ];
    if (types.length)
      clauses.push(Prisma.sql`b.type IN (${Prisma.join(types)})`);
    for (const [field, selected] of [
      [Prisma.sql`b.subject`, values(query.subject)],
      [Prisma.sql`b.language`, values(query.language)],
    ] as const)
      if (selected.length)
        clauses.push(Prisma.sql`${field} IN (${Prisma.join(selected)})`);
    // Escape LIKE wildcards so ISBN, code and text searches are literal substrings.
    const escaped = search.replace(/[!%_]/g, (ch) => `!${ch}`);
    const pattern = `%${escaped}%`;
    if (search)
      clauses.push(
        Prisma.sql`(b.title LIKE ${pattern} ESCAPE '!' OR b.author LIKE ${pattern} ESCAPE '!' OR b.subject LIKE ${pattern} ESCAPE '!' OR b.isbnIssn LIKE ${pattern} ESCAPE '!' OR b.code LIKE ${pattern} ESCAPE '!')`,
      );
    if (availabilities.length && !ebooksOnly) {
      const conditions = availabilities.map((v) =>
        v === 'TERSEDIA'
          ? available
          : v === 'DIRESERVASI'
            ? Prisma.sql`NOT ${available} AND ${reserved}`
            : Prisma.sql`NOT ${available} AND NOT ${reserved}`,
      );
      clauses.push(
        Prisma.sql`b.type = 'FISIK' AND (${Prisma.join(
          conditions.map((c) => Prisma.sql`(${c})`),
          ' OR ',
        )})`,
      );
    }
    const where = Prisma.join(
      clauses.map((c) => Prisma.sql`(${c})`),
      ' AND ',
    );
    const orders: Record<string, Prisma.Sql> = {
      relevance: search
        ? Prisma.sql`CASE WHEN b.title = ${search} THEN 0 WHEN b.code = ${search} OR b.isbnIssn = ${search} THEN 1 WHEN b.title LIKE ${`${escaped}%`} ESCAPE '!' THEN 2 WHEN b.title LIKE ${pattern} ESCAPE '!' THEN 3 WHEN b.author LIKE ${pattern} ESCAPE '!' THEN 4 ELSE 5 END ASC, b.title ASC`
        : Prisma.sql`b.code ASC`,
      newest: Prisma.sql`b.createdAt DESC`,
      titleAsc: Prisma.sql`b.title ASC`,
      titleDesc: Prisma.sql`b.title DESC`,
      yearDesc: Prisma.sql`b.year DESC`,
      yearAsc: Prisma.sql`b.year ASC`,
    };
    const sort = query.sort ?? 'relevance';
    if (typeof sort !== 'string' || !Object.hasOwn(orders, sort))
      throw new BadRequestException('Urutan tidak valid.');
    const [count, rows] = await this.prisma.$transaction([
      this.prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`SELECT COUNT(*) AS total FROM books b WHERE ${where}`,
      ),
      this.prisma.$queryRaw<
        CatalogRow[]
      >(Prisma.sql`SELECT b.id, b.code, b.title, b.author, b.year, b.type, b.coverUrl, b.subject, b.language, b.isDemo,
        (SELECT COUNT(*) FROM book_copies c WHERE c.bookId=b.id) AS totalCopies,
        (SELECT COUNT(*) FROM book_copies c WHERE c.bookId=b.id AND c.status='TERSEDIA') AS availableCopies,
        (SELECT COUNT(*) FROM book_copies c WHERE c.bookId=b.id AND c.status='DIRESERVASI') AS reservedCopies
        FROM books b WHERE ${where} ORDER BY ${orders[sort]}, b.id ASC LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
    ]);
    const total = Number(count[0].total);
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
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async detail(input: string) {
    if (!/^\d+$/.test(input) || !Number.isSafeInteger(Number(input)))
      throw new NotFoundException('Koleksi tidak ditemukan.');
    const book = await this.prisma.book.findUnique({
      where: { id: Number(input) },
      include: { copies: { orderBy: { code: 'asc' } } },
    });
    if (!book) throw new NotFoundException('Koleksi tidak ditemukan.');
    const availableCopies = book.copies.filter(
      (c) => c.status === CopyStatus.TERSEDIA,
    ).length;
    const reservedCopies = book.copies.filter(
      (c) => c.status === CopyStatus.DIRESERVASI,
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
