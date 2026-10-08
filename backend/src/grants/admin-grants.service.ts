import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { GrantStatus, Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type GrantInput = {
  donorName: string;
  receivedAt: Date;
  status: GrantStatus;
  note: string | null;
  items: Array<{
    title: string;
    quantity: number;
  }>;
};

@Injectable()
export class AdminGrantsService {
  constructor(private readonly prisma: PrismaService) {}

  private positiveId(value: string) {
    if (!/^\d+$/.test(value)) {
      throw new BadRequestException('ID hibah tidak valid.');
    }

    const id = Number(value);

    if (!Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('ID hibah tidak valid.');
    }

    return id;
  }

  private queryText(value: unknown, label: string) {
    if (value === undefined) {
      return undefined;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${label} tidak valid.`);
    }

    return value.trim();
  }

  private queryInteger(
    value: unknown,
    fallback: number,
    max: number,
    label: string,
  ) {
    const raw = this.queryText(value, label);

    if (!raw) {
      return fallback;
    }

    if (!/^\d+$/.test(raw)) {
      throw new BadRequestException(`${label} tidak valid.`);
    }

    const result = Number(raw);

    if (!Number.isSafeInteger(result) || result < 1 || result > max) {
      throw new BadRequestException(`${label} tidak valid.`);
    }

    return result;
  }

  private buildWhere(query: Record<string, unknown>) {
    const search = this.queryText(query.search, 'Pencarian') ?? '';

    if (search.length > 191) {
      throw new BadRequestException('Pencarian maksimal 191 karakter.');
    }

    const statusRaw = this.queryText(query.status, 'Status') ?? '';

    let status: GrantStatus | undefined;

    if (statusRaw) {
      if (!Object.values(GrantStatus).includes(statusRaw as GrantStatus)) {
        throw new BadRequestException('Status katalogisasi tidak valid.');
      }

      status = statusRaw as GrantStatus;
    }

    const yearRaw = this.queryText(query.year, 'Tahun') ?? '';

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

    const where: Prisma.BookGrantWhereInput = {
      ...(status ? { status } : {}),
      ...(year
        ? {
            receivedAt: {
              gte: new Date(`${year}-01-01T00:00:00.000Z`),
              lt: new Date(`${year + 1}-01-01T00:00:00.000Z`),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              {
                donorName: {
                  contains: search,
                },
              },
              {
                items: {
                  some: {
                    title: {
                      contains: search,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    return where;
  }

  private record(body: unknown) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Data hibah tidak valid.');
    }

    return body as Record<string, unknown>;
  }

  private input(body: unknown): GrantInput {
    const value = this.record(body);

    const allowed = new Set([
      'donorName',
      'receivedAt',
      'status',
      'note',
      'items',
    ]);

    if (Object.keys(value).some((key) => !allowed.has(key))) {
      throw new BadRequestException(
        'Terdapat field hibah yang tidak diizinkan.',
      );
    }

    const donorName =
      typeof value.donorName === 'string' ? value.donorName.trim() : '';

    if (donorName.length < 2 || donorName.length > 191) {
      throw new BadRequestException('Asal / pemberi hibah tidak valid.');
    }

    const dateText =
      typeof value.receivedAt === 'string' ? value.receivedAt.trim() : '';

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      throw new BadRequestException('Tanggal penerimaan tidak valid.');
    }

    const receivedAt = new Date(`${dateText}T00:00:00.000Z`);

    if (
      Number.isNaN(receivedAt.getTime()) ||
      receivedAt.toISOString().slice(0, 10) !== dateText
    ) {
      throw new BadRequestException('Tanggal penerimaan tidak valid.');
    }

    const status = value.status;

    if (
      status !== GrantStatus.BELUM_DIKATALOGKAN &&
      status !== GrantStatus.SUDAH_DIKATALOGKAN
    ) {
      throw new BadRequestException('Status katalogisasi tidak valid.');
    }

    let note: string | null = null;

    if (value.note !== undefined && value.note !== null) {
      if (typeof value.note !== 'string') {
        throw new BadRequestException('Catatan hibah tidak valid.');
      }

      const normalized = value.note.trim();

      if (normalized.length > 3000) {
        throw new BadRequestException('Catatan hibah maksimal 3000 karakter.');
      }

      note = normalized || null;
    }

    if (
      !Array.isArray(value.items) ||
      value.items.length < 1 ||
      value.items.length > 100
    ) {
      throw new BadRequestException(
        'Hibah wajib memiliki 1 sampai 100 judul buku.',
      );
    }

    const items = value.items.map((raw, index) => {
      const item = this.record(raw);

      const title = typeof item.title === 'string' ? item.title.trim() : '';

      if (title.length < 2 || title.length > 191) {
        throw new BadRequestException(
          `Judul buku ke-${index + 1} tidak valid.`,
        );
      }

      const quantity =
        typeof item.quantity === 'number'
          ? item.quantity
          : Number(item.quantity);

      if (
        !Number.isSafeInteger(quantity) ||
        quantity < 1 ||
        quantity > 100000
      ) {
        throw new BadRequestException(
          `Jumlah buku ke-${index + 1} tidak valid.`,
        );
      }

      return {
        title,
        quantity,
      };
    });

    return {
      donorName,
      receivedAt,
      status,
      note,
      items,
    };
  }

  async list(query: Record<string, unknown>) {
    const where = this.buildWhere(query);

    const page = this.queryInteger(query.page, 1, 1_000_000, 'Halaman');

    const limit = this.queryInteger(query.limit, 10, 50, 'Batas data');

    const [total, statistics, rawYears] = await Promise.all([
      this.prisma.bookGrant.count({
        where,
      }),
      this.prisma.bookGrant.findMany({
        where,
        select: {
          status: true,
          items: {
            select: {
              quantity: true,
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

    const totalPages = Math.max(1, Math.ceil(total / limit));

    const actualPage = Math.min(page, totalPages);

    const rows = await this.prisma.bookGrant.findMany({
      where,
      orderBy: [
        {
          receivedAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      skip: (actualPage - 1) * limit,
      take: limit,
      select: {
        id: true,
        donorName: true,
        receivedAt: true,
        status: true,
        note: true,
        isDemo: true,
        items: {
          orderBy: {
            id: 'asc',
          },
          select: {
            id: true,
            title: true,
            quantity: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    });

    const stats = statistics.reduce(
      (result, grant) => {
        const books = grant.items.reduce((sum, item) => sum + item.quantity, 0);

        result.totalBooks += books;
        result.totalReceipts += 1;

        if (grant.status === GrantStatus.SUDAH_DIKATALOGKAN) {
          result.cataloguedBooks += books;
        } else {
          result.pendingBooks += books;
        }

        return result;
      },
      {
        totalBooks: 0,
        pendingBooks: 0,
        cataloguedBooks: 0,
        totalReceipts: 0,
      },
    );

    return {
      data: rows.map((grant) => ({
        ...grant,
        totalTitles: grant.items.length,
        totalBooks: grant.items.reduce((sum, item) => sum + item.quantity, 0),
      })),
      stats,
      years: rawYears.map((row) => Number(row.year)),
      meta: {
        page: actualPage,
        limit,
        total,
        totalPages,
      },
    };
  }

  async detail(idText: string) {
    const id = this.positiveId(idText);

    const grant = await this.prisma.bookGrant.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        donorName: true,
        receivedAt: true,
        status: true,
        note: true,
        isDemo: true,
        createdAt: true,
        updatedAt: true,
        items: {
          orderBy: {
            id: 'asc',
          },
          select: {
            id: true,
            title: true,
            quantity: true,
          },
        },
      },
    });

    if (!grant) {
      throw new NotFoundException('Data hibah tidak ditemukan.');
    }

    return {
      grant: {
        ...grant,
        totalTitles: grant.items.length,
        totalBooks: grant.items.reduce((sum, item) => sum + item.quantity, 0),
      },
    };
  }

  async create(body: unknown) {
    const input = this.input(body);

    const grant = await this.prisma.bookGrant.create({
      data: {
        donorName: input.donorName,
        receivedAt: input.receivedAt,
        status: input.status,
        note: input.note,
        isDemo: false,
        items: {
          create: input.items,
        },
      },
      select: {
        id: true,
      },
    });

    return this.detail(String(grant.id));
  }

  async update(idText: string, body: unknown) {
    const id = this.positiveId(idText);
    const input = this.input(body);

    const existing = await this.prisma.bookGrant.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('Data hibah tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.bookGrant.update({
        where: {
          id,
        },
        data: {
          donorName: input.donorName,
          receivedAt: input.receivedAt,
          status: input.status,
          note: input.note,
        },
      });

      await tx.bookGrantItem.deleteMany({
        where: {
          grantId: id,
        },
      });

      await tx.bookGrantItem.createMany({
        data: input.items.map((item) => ({
          grantId: id,
          title: item.title,
          quantity: item.quantity,
        })),
      });
    });

    return this.detail(String(id));
  }
}
