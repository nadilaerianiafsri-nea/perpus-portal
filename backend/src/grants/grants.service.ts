import { BadRequestException, Injectable } from '@nestjs/common';

import { GrantStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GrantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: Record<string, unknown>) {
    const text = (key: string) => {
      const value = query[key];

      if (value === undefined) {
        return undefined;
      }

      if (typeof value !== 'string') {
        throw new BadRequestException(`${key} tidak valid.`);
      }

      return value.trim();
    };

    const search = text('search') ?? '';

    if (search.length > 191) {
      throw new BadRequestException('Pencarian maksimal 191 karakter.');
    }

    const statusRaw = text('status');

    let status: GrantStatus | undefined;

    if (statusRaw) {
      if (!Object.values(GrantStatus).includes(statusRaw as GrantStatus)) {
        throw new BadRequestException('Status hibah tidak valid.');
      }

      status = statusRaw as GrantStatus;
    }

    const yearRaw = text('year');

    let year: number | undefined;

    if (yearRaw) {
      if (!/^\d{4}$/.test(yearRaw)) {
        throw new BadRequestException('Tahun penerimaan tidak valid.');
      }

      year = Number(yearRaw);

      if (year < 1900 || year > 2100) {
        throw new BadRequestException('Tahun penerimaan tidak valid.');
      }
    }

    const parsePositive = (key: string, fallback: number, max: number) => {
      const raw = text(key);

      if (!raw) {
        return fallback;
      }

      if (!/^\d+$/.test(raw)) {
        throw new BadRequestException(`${key} tidak valid.`);
      }

      const value = Number(raw);

      if (!Number.isSafeInteger(value) || value < 1 || value > max) {
        throw new BadRequestException(`${key} tidak valid.`);
      }

      return value;
    };

    const page = parsePositive('page', 1, 1_000_000);
    const limit = parsePositive('limit', 10, 50);

    const grantWhere: Prisma.BookGrantWhereInput = {
      ...(status ? { status } : {}),
      ...(year
        ? {
            receivedAt: {
              gte: new Date(`${year}-01-01T00:00:00.000Z`),
              lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
            },
          }
        : {}),
    };

    const where: Prisma.BookGrantItemWhereInput = {
      grant: {
        is: grantWhere,
      },
      ...(search
        ? {
            OR: [
              {
                title: {
                  contains: search,
                },
              },
              {
                grant: {
                  is: {
                    donorName: {
                      contains: search,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const [
      totalTitles,
      bookTotal,
      catalogued,
      demoRecords,
      total,
      rows,
      rawYears,
    ] = await Promise.all([
      this.prisma.bookGrantItem.count(),
      this.prisma.bookGrantItem.aggregate({
        _sum: {
          quantity: true,
        },
      }),
      this.prisma.bookGrantItem.count({
        where: {
          grant: {
            is: {
              status: GrantStatus.SUDAH_DIKATALOGKAN,
            },
          },
        },
      }),
      this.prisma.bookGrant.count({
        where: {
          isDemo: true,
        },
      }),
      this.prisma.bookGrantItem.count({
        where,
      }),
      this.prisma.bookGrantItem.findMany({
        where,
        orderBy: [
          {
            grant: {
              receivedAt: 'desc',
            },
          },
          {
            grant: {
              id: 'desc',
            },
          },
          {
            id: 'asc',
          },
        ],
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          quantity: true,
          grant: {
            select: {
              donorName: true,
              receivedAt: true,
              status: true,
              isDemo: true,
            },
          },
        },
      }),
      this.prisma.$queryRaw<Array<{ year: number | bigint }>>`
        SELECT DISTINCT YEAR(receivedAt) AS year
        FROM book_grants
        ORDER BY year DESC
      `,
    ]);

    return {
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        quantity: row.quantity,
        donorName: row.grant.donorName,
        receivedAt: row.grant.receivedAt,
        status: row.grant.status,
        isDemo: row.grant.isDemo,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        totalTitles,
        totalBooks: bookTotal._sum.quantity ?? 0,
        catalogued,
        demoRecords,
      },
      years: rawYears.map((row) => Number(row.year)),
    };
  }
}
