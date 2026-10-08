import { BadRequestException, Injectable } from '@nestjs/common';

import { MemberType, Prisma, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MembersService } from './members.service';

const DAY = 86_400_000;
const JAKARTA_OFFSET = 7 * 60 * 60 * 1000;

type CommonInput = {
  search?: string;
  memberType?: string;
  page?: string;
  limit?: string;
};

type ReservationInput = CommonInput & {
  status?: string;
};

type LoanInput = CommonInput & {
  status?: string;
  due?: string;
};

type ReturnInput = CommonInput & {
  status?: string;
};

type LostInput = CommonInput & {
  extension?: string;
};

@Injectable()
export class AdminTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly members: MembersService,
  ) {}

  private searchValue(value?: string) {
    const search = value?.trim() ?? '';

    if (search.length > 100) {
      throw new BadRequestException('Kata pencarian terlalu panjang.');
    }

    return search;
  }

  private memberType(value?: string): MemberType | null {
    if (!value || value === 'ALL') {
      return null;
    }

    if (
      value !== MemberType.UMUM &&
      value !== MemberType.MAHASISWA &&
      value !== MemberType.PEGAWAI
    ) {
      throw new BadRequestException('Jenis anggota tidak valid.');
    }

    return value;
  }

  private page(value?: string) {
    if (!value) {
      return 1;
    }

    if (!/^\d+$/.test(value)) {
      throw new BadRequestException('Nomor halaman tidak valid.');
    }

    const page = Number(value);

    if (!Number.isSafeInteger(page) || page < 1) {
      throw new BadRequestException('Nomor halaman tidak valid.');
    }

    return page;
  }

  private limit(value?: string) {
    if (!value) {
      return 20;
    }

    if (!/^\d+$/.test(value)) {
      throw new BadRequestException('Batas data tidak valid.');
    }

    const limit = Number(value);

    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Batas data tidak valid.');
    }

    return limit;
  }

  private jakartaDayRange(now = new Date()) {
    const local = new Date(now.getTime() + JAKARTA_OFFSET);

    const startUtc =
      Date.UTC(
        local.getUTCFullYear(),
        local.getUTCMonth(),
        local.getUTCDate(),
      ) - JAKARTA_OFFSET;

    return {
      start: new Date(startUtc),
      end: new Date(startUtc + DAY),
    };
  }

  private jakartaMonthRange(now = new Date()) {
    const local = new Date(now.getTime() + JAKARTA_OFFSET);

    const startUtc =
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - JAKARTA_OFFSET;

    const endUtc =
      Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 1) -
      JAKARTA_OFFSET;

    return {
      start: new Date(startUtc),
      end: new Date(endUtc),
    };
  }

  private userWhere(memberType: MemberType | null): Prisma.UserWhereInput {
    return {
      role: Role.PENGUNJUNG,
      ...(memberType
        ? {
            memberType,
          }
        : {}),
    };
  }

  private reservationSearch(search: string): Prisma.ReservationWhereInput {
    if (!search) {
      return {};
    }

    return {
      OR: [
        {
          user: {
            is: {
              name: {
                contains: search,
              },
            },
          },
        },
        {
          user: {
            is: {
              email: {
                contains: search,
              },
            },
          },
        },
        {
          user: {
            is: {
              memberProfile: {
                is: {
                  whatsapp: {
                    contains: search,
                  },
                },
              },
            },
          },
        },
        {
          book: {
            is: {
              title: {
                contains: search,
              },
            },
          },
        },
        {
          book: {
            is: {
              code: {
                contains: search,
              },
            },
          },
        },
        {
          copy: {
            is: {
              code: {
                contains: search,
              },
            },
          },
        },
      ],
    };
  }

  private loanSearch(search: string): Prisma.LoanWhereInput {
    if (!search) {
      return {};
    }

    return {
      OR: [
        {
          user: {
            is: {
              name: {
                contains: search,
              },
            },
          },
        },
        {
          user: {
            is: {
              email: {
                contains: search,
              },
            },
          },
        },
        {
          user: {
            is: {
              memberProfile: {
                is: {
                  whatsapp: {
                    contains: search,
                  },
                },
              },
            },
          },
        },
        {
          book: {
            is: {
              title: {
                contains: search,
              },
            },
          },
        },
        {
          book: {
            is: {
              code: {
                contains: search,
              },
            },
          },
        },
        {
          copy: {
            is: {
              code: {
                contains: search,
              },
            },
          },
        },
      ],
    };
  }

  private async pageMeta(
    total: number,
    pageInput?: string,
    limitInput?: string,
  ) {
    const requestedPage = this.page(pageInput);
    const limit = this.limit(limitInput);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);

    return {
      page,
      limit,
      total,
      totalPages,
    };
  }

  private reservationMember(row: {
    user: {
      id: number;
      name: string;
      email: string;
      memberType: MemberType | null;
      memberProfile: {
        whatsapp: string;
      } | null;
    };
  }) {
    return {
      id: row.user.id,
      name: row.user.name,
      email: row.user.email,
      memberType: row.user.memberType,
      whatsapp: row.user.memberProfile?.whatsapp ?? '',
    };
  }

  async reservations(input: ReservationInput) {
    await this.members.expireReservations();

    const search = this.searchValue(input.search);
    const memberType = this.memberType(input.memberType);

    const allowedStatuses = [
      'ALL',
      'MENUNGGU_PENGAMBILAN',
      'KEDALUWARSA',
      'DIBATALKAN',
      'DIAMBIL',
    ] as const;

    const status = input.status?.trim() || 'ALL';

    if (!allowedStatuses.includes(status as (typeof allowedStatuses)[number])) {
      throw new BadRequestException('Status reservasi tidak valid.');
    }

    const baseWhere: Prisma.ReservationWhereInput = {
      user: {
        is: this.userWhere(memberType),
      },
      ...this.reservationSearch(search),
    };

    const dataWhere: Prisma.ReservationWhereInput = {
      ...baseWhere,
      ...(status !== 'ALL'
        ? {
            status: status as
              'MENUNGGU_PENGAMBILAN' | 'KEDALUWARSA' | 'DIBATALKAN' | 'DIAMBIL',
          }
        : {}),
    };

    const now = new Date();
    const almost = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const [waiting, almostExpired, expired, pickedUp, total] =
      await Promise.all([
        this.prisma.reservation.count({
          where: {
            ...baseWhere,
            status: 'MENUNGGU_PENGAMBILAN',
          },
        }),
        this.prisma.reservation.count({
          where: {
            ...baseWhere,
            status: 'MENUNGGU_PENGAMBILAN',
            expiresAt: {
              gt: now,
              lte: almost,
            },
          },
        }),
        this.prisma.reservation.count({
          where: {
            ...baseWhere,
            status: 'KEDALUWARSA',
          },
        }),
        this.prisma.reservation.count({
          where: {
            ...baseWhere,
            status: 'DIAMBIL',
          },
        }),
        this.prisma.reservation.count({
          where: dataWhere,
        }),
      ]);

    const meta = await this.pageMeta(total, input.page, input.limit);

    const rows = await this.prisma.reservation.findMany({
      where: dataWhere,
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      skip: (meta.page - 1) * meta.limit,
      take: meta.limit,
      select: {
        id: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        pickedUpAt: true,
        cancelledAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberType: true,
            memberProfile: {
              select: {
                whatsapp: true,
              },
            },
          },
        },
        book: {
          select: {
            id: true,
            code: true,
            title: true,
            coverUrl: true,
          },
        },
        copy: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    return {
      stats: {
        waiting,
        almostExpired,
        expired,
        pickedUp,
      },
      data: rows.map((row) => ({
        id: row.id,
        status: row.status,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        pickedUpAt: row.pickedUpAt,
        cancelledAt: row.cancelledAt,
        member: this.reservationMember(row),
        book: row.book,
        copy: row.copy,
      })),
      meta,
    };
  }

  private baseActiveLoanWhere(
    search: string,
    memberType: MemberType | null,
  ): Prisma.LoanWhereInput {
    return {
      status: 'AKTIF',
      book: {
        is: {
          type: 'FISIK',
        },
      },
      user: {
        is: this.userWhere(memberType),
      },
      ...this.loanSearch(search),
    };
  }

  private loanStatusWhere(value?: string): Prisma.LoanWhereInput {
    const status = value?.trim() || 'ALL';
    const now = new Date();

    switch (status) {
      case 'ALL':
      case 'ACTIVE':
        return {};

      case 'DUE_SOON':
        return {
          dueAt: {
            gte: now,
            lte: new Date(now.getTime() + DAY),
          },
        };

      case 'OVERDUE':
        return {
          dueAt: {
            lt: now,
          },
        };

      default:
        throw new BadRequestException('Status peminjaman tidak valid.');
    }
  }

  private loanDueWhere(value?: string): Prisma.LoanWhereInput {
    const due = value?.trim() || 'ALL';
    const now = new Date();

    switch (due) {
      case 'ALL':
        return {};

      case 'TODAY': {
        const range = this.jakartaDayRange(now);

        return {
          dueAt: {
            gte: range.start,
            lt: range.end,
          },
        };
      }

      case '7_DAYS':
        return {
          dueAt: {
            gte: now,
            lte: new Date(now.getTime() + 7 * DAY),
          },
        };

      case '30_DAYS':
        return {
          dueAt: {
            gte: now,
            lte: new Date(now.getTime() + 30 * DAY),
          },
        };

      case 'THIS_MONTH': {
        const range = this.jakartaMonthRange(now);

        return {
          dueAt: {
            gte: range.start,
            lt: range.end,
          },
        };
      }

      default:
        throw new BadRequestException('Filter jatuh tempo tidak valid.');
    }
  }

  async loans(input: LoanInput) {
    const search = this.searchValue(input.search);
    const memberType = this.memberType(input.memberType);

    const baseWhere = this.baseActiveLoanWhere(search, memberType);

    const statusWhere = this.loanStatusWhere(input.status);

    const dueWhere = this.loanDueWhere(input.due);

    const dataWhere: Prisma.LoanWhereInput = {
      AND: [baseWhere, statusWhere, dueWhere],
    };

    const now = new Date();
    const dayLater = new Date(now.getTime() + DAY);

    const [physicalActive, dueSoon, overdue, total] = await Promise.all([
      this.prisma.loan.count({
        where: baseWhere,
      }),
      this.prisma.loan.count({
        where: {
          AND: [
            baseWhere,
            {
              dueAt: {
                gte: now,
                lte: dayLater,
              },
            },
          ],
        },
      }),
      this.prisma.loan.count({
        where: {
          AND: [
            baseWhere,
            {
              dueAt: {
                lt: now,
              },
            },
          ],
        },
      }),
      this.prisma.loan.count({
        where: dataWhere,
      }),
    ]);

    const meta = await this.pageMeta(total, input.page, input.limit);

    const rows = await this.prisma.loan.findMany({
      where: dataWhere,
      orderBy: [
        {
          dueAt: 'asc',
        },
        {
          id: 'desc',
        },
      ],
      skip: (meta.page - 1) * meta.limit,
      take: meta.limit,
      select: {
        id: true,
        status: true,
        borrowedAt: true,
        dueAt: true,
        extensionCount: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberType: true,
            memberProfile: {
              select: {
                whatsapp: true,
              },
            },
          },
        },
        book: {
          select: {
            id: true,
            code: true,
            title: true,
            coverUrl: true,
          },
        },
        copy: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    const ebookWhere: Prisma.UserEBookWhereInput = {
      user: {
        is: this.userWhere(memberType),
      },
      book: {
        is: {
          type: 'EBOOK',
          isActive: true,
        },
      },
      ...(search
        ? {
            OR: [
              {
                user: {
                  is: {
                    name: {
                      contains: search,
                    },
                  },
                },
              },
              {
                user: {
                  is: {
                    email: {
                      contains: search,
                    },
                  },
                },
              },
              {
                book: {
                  is: {
                    title: {
                      contains: search,
                    },
                  },
                },
              },
              {
                book: {
                  is: {
                    code: {
                      contains: search,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };

    const ebookRows = await this.prisma.userEBook.findMany({
      where: ebookWhere,
      orderBy: [
        {
          lastOpenedAt: 'desc',
        },
        {
          addedAt: 'desc',
        },
      ],
      select: {
        id: true,
        addedAt: true,
        lastOpenedAt: true,
        progress: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberType: true,
            memberProfile: {
              select: {
                whatsapp: true,
              },
            },
          },
        },
        book: {
          select: {
            id: true,
            code: true,
            title: true,
            accessDurationDays: true,
          },
        },
      },
    });

    const activeEbooks = ebookRows
      .map((row) => {
        const endsAt =
          row.book.accessDurationDays === null
            ? null
            : new Date(
                row.addedAt.getTime() + row.book.accessDurationDays * DAY,
              );

        return {
          ...row,
          endsAt,
        };
      })
      .filter((row) => row.endsAt === null || row.endsAt > now);

    return {
      stats: {
        physicalActive,
        ebookActive: activeEbooks.length,
        dueSoon,
        overdue,
      },
      data: rows.map((row) => ({
        id: row.id,
        status: row.status,
        borrowedAt: row.borrowedAt,
        dueAt: row.dueAt,
        extensionCount: row.extensionCount,
        member: this.reservationMember(row),
        book: row.book,
        copy: row.copy,
      })),
      ebooks: activeEbooks.slice(0, 50).map((row) => ({
        id: row.id,
        addedAt: row.addedAt,
        lastOpenedAt: row.lastOpenedAt,
        endsAt: row.endsAt,
        progress: row.progress,
        member: this.reservationMember(row),
        book: {
          id: row.book.id,
          code: row.book.code,
          title: row.book.title,
        },
      })),
      meta,
    };
  }

  async returns(input: ReturnInput) {
    const search = this.searchValue(input.search);
    const memberType = this.memberType(input.memberType);

    const baseWhere = this.baseActiveLoanWhere(search, memberType);

    const status = input.status?.trim() || 'ALL';

    const today = this.jakartaDayRange();

    let filterWhere: Prisma.LoanWhereInput | undefined;

    switch (status) {
      case 'ALL':
        filterWhere = undefined;
        break;

      case 'DUE_TODAY':
        filterWhere = {
          dueAt: {
            gte: today.start,
            lt: today.end,
          },
        };
        break;

      case 'OVERDUE':
        filterWhere = {
          dueAt: {
            lt: new Date(),
          },
        };
        break;

      default:
        throw new BadRequestException('Status pengembalian tidak valid.');
    }

    const dataWhere: Prisma.LoanWhereInput = filterWhere
      ? {
          AND: [baseWhere, filterWhere],
        }
      : baseWhere;

    const returnedBase: Prisma.LoanWhereInput = {
      status: 'DIKEMBALIKAN',
      book: {
        is: {
          type: 'FISIK',
        },
      },
      user: {
        is: this.userWhere(memberType),
      },
      ...this.loanSearch(search),
    };

    const [active, dueToday, overdue, returnedToday, total] = await Promise.all(
      [
        this.prisma.loan.count({
          where: baseWhere,
        }),
        this.prisma.loan.count({
          where: {
            AND: [
              baseWhere,
              {
                dueAt: {
                  gte: today.start,
                  lt: today.end,
                },
              },
            ],
          },
        }),
        this.prisma.loan.count({
          where: {
            AND: [
              baseWhere,
              {
                dueAt: {
                  lt: new Date(),
                },
              },
            ],
          },
        }),
        this.prisma.loan.count({
          where: {
            AND: [
              returnedBase,
              {
                returnedAt: {
                  gte: today.start,
                  lt: today.end,
                },
              },
            ],
          },
        }),
        this.prisma.loan.count({
          where: dataWhere,
        }),
      ],
    );

    const meta = await this.pageMeta(total, input.page, input.limit);

    const rows = await this.prisma.loan.findMany({
      where: dataWhere,
      orderBy: [
        {
          dueAt: 'asc',
        },
        {
          id: 'desc',
        },
      ],
      skip: (meta.page - 1) * meta.limit,
      take: meta.limit,
      select: {
        id: true,
        status: true,
        borrowedAt: true,
        dueAt: true,
        extensionCount: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberType: true,
            memberProfile: {
              select: {
                whatsapp: true,
              },
            },
          },
        },
        book: {
          select: {
            id: true,
            code: true,
            title: true,
            coverUrl: true,
          },
        },
        copy: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    return {
      stats: {
        active,
        dueToday,
        overdue,
        returnedToday,
      },
      data: rows.map((row) => ({
        id: row.id,
        status: row.status,
        borrowedAt: row.borrowedAt,
        dueAt: row.dueAt,
        extensionCount: row.extensionCount,
        member: this.reservationMember(row),
        book: row.book,
        copy: row.copy,
      })),
      meta,
    };
  }

  async lostBooks(input: LostInput) {
    const search = this.searchValue(input.search);
    const memberType = this.memberType(input.memberType);

    const extension = input.extension?.trim() || 'ALL';

    if (!['ALL', 'EXTENDED', 'NOT_EXTENDED'].includes(extension)) {
      throw new BadRequestException('Filter perpanjangan tidak valid.');
    }

    const baseWhere: Prisma.LoanWhereInput = {
      status: 'HILANG',
      book: {
        is: {
          type: 'FISIK',
        },
      },
      user: {
        is: this.userWhere(memberType),
      },
      ...this.loanSearch(search),
    };

    const dataWhere: Prisma.LoanWhereInput = {
      ...baseWhere,
      ...(extension === 'EXTENDED'
        ? {
            extensionCount: {
              gt: 0,
            },
          }
        : extension === 'NOT_EXTENDED'
          ? {
              extensionCount: 0,
            }
          : {}),
    };

    const [totalStats, total, affected, extended] = await Promise.all([
      this.prisma.loan.count({
        where: baseWhere,
      }),
      this.prisma.loan.count({
        where: dataWhere,
      }),
      this.prisma.loan.groupBy({
        by: ['userId'],
        where: baseWhere,
      }),
      this.prisma.loan.count({
        where: {
          ...baseWhere,
          extensionCount: {
            gt: 0,
          },
        },
      }),
    ]);

    const meta = await this.pageMeta(total, input.page, input.limit);

    const rows = await this.prisma.loan.findMany({
      where: dataWhere,
      orderBy: {
        id: 'desc',
      },
      skip: (meta.page - 1) * meta.limit,
      take: meta.limit,
      select: {
        id: true,
        borrowedAt: true,
        dueAt: true,
        extensionCount: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            memberType: true,
            memberProfile: {
              select: {
                whatsapp: true,
              },
            },
          },
        },
        book: {
          select: {
            id: true,
            code: true,
            title: true,
            coverUrl: true,
          },
        },
        copy: {
          select: {
            id: true,
            code: true,
          },
        },
      },
    });

    return {
      stats: {
        total: totalStats,
        affectedMembers: affected.length,
        extended,
      },
      data: rows.map((row) => ({
        id: row.id,
        borrowedAt: row.borrowedAt,
        dueAt: row.dueAt,
        extensionCount: row.extensionCount,
        member: this.reservationMember(row),
        book: row.book,
        copy: row.copy,
      })),
      meta,
    };
  }
}
