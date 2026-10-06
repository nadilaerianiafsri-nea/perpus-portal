import { BadRequestException, Injectable } from '@nestjs/common';
import { GrantStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
function integer(value: unknown, fallback: number, min: number, max: number) {
  if (value === undefined || value === '') return fallback;
  if (
    typeof value !== 'string' ||
    !/^\d+$/.test(value) ||
    Number(value) < min ||
    Number(value) > max
  )
    throw new BadRequestException(
      'Halaman, jumlah per halaman atau tahun tidak valid.',
    );
  return Number(value);
}
@Injectable()
export class GrantsService {
  constructor(private readonly prisma: PrismaService) {}
  async list(query: Record<string, unknown>) {
    const page = integer(query.page, 1, 1, 100000);
    const limit = integer(query.limit, 10, 1, 50);
    const year = integer(query.year, 0, 1900, 9998);
    if (query.search !== undefined && typeof query.search !== 'string')
      throw new BadRequestException('Pencarian hibah tidak valid.');
    const search = (query.search as string | undefined)?.trim() ?? '';
    if (search.length > 191)
      throw new BadRequestException('Pencarian hibah terlalu panjang.');
    if (
      query.status !== undefined &&
      query.status !== '' &&
      (typeof query.status !== 'string' ||
        !Object.values(GrantStatus).includes(query.status as GrantStatus))
    )
      throw new BadRequestException('Status hibah tidak valid.');
    // Prisma binds user values; escape LIKE wildcards for a literal substring search.
    const literal = search.replace(/[\\%_]/g, (value) => `\\${value}`);
    const where: Prisma.BookGrantWhereInput = {
      ...(search
        ? {
            OR: [
              { title: { contains: literal } },
              { donorName: { contains: literal } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status as GrantStatus } : {}),
      ...(year
        ? {
            receivedAt: {
              gte: new Date(`${year}-01-01T00:00:00Z`),
              lt: new Date(`${year + 1}-01-01T00:00:00Z`),
            },
          }
        : {}),
    };
    const [total, data, aggregate, catalogued, demoRecords, years] =
      await this.prisma.$transaction([
        this.prisma.bookGrant.count({ where }),
        this.prisma.bookGrant.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
          select: {
            id: true,
            title: true,
            quantity: true,
            donorName: true,
            receivedAt: true,
            status: true,
            isDemo: true,
          },
        }),
        this.prisma.bookGrant.aggregate({
          _count: { _all: true },
          _sum: { quantity: true },
        }),
        this.prisma.bookGrant.count({
          where: { status: GrantStatus.SUDAH_DIKATALOGKAN },
        }),
        this.prisma.bookGrant.count({ where: { isDemo: true } }),
        this.prisma.$queryRaw<
          { year: number }[]
        >`SELECT DISTINCT YEAR(receivedAt) AS year FROM book_grants ORDER BY year DESC`,
      ]);
    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
      summary: {
        totalTitles: aggregate._count._all,
        totalBooks: aggregate._sum.quantity ?? 0,
        catalogued,
        demoRecords,
      },
      years: years.map((row) => Number(row.year)),
    };
  }
}
