import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  LoanStatus,
  MemberType,
  Prisma,
  ReservationStatus,
  Role,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { objectInput } from './member.validation';

type ListInput = {
  search?: string;
  memberType?: string;
  verified?: string;
  page?: string;
  limit?: string;
};

type VerifiedFilter = 'ALL' | 'VERIFIED' | 'UNVERIFIED';

@Injectable()
export class AdminMembersService {
  constructor(private readonly prisma: PrismaService) {}

  private parseMemberType(value?: string): MemberType | null {
    if (!value || value === 'ALL') {
      return null;
    }

    if (
      value !== MemberType.UMUM &&
      value !== MemberType.MAHASISWA &&
      value !== MemberType.PEGAWAI
    ) {
      throw new BadRequestException('Filter jenis anggota tidak valid.');
    }

    return value;
  }

  private parseVerified(value?: string): VerifiedFilter {
    if (!value || value === 'ALL') {
      return 'ALL';
    }

    if (value !== 'VERIFIED' && value !== 'UNVERIFIED') {
      throw new BadRequestException('Filter verifikasi tidak valid.');
    }

    return value;
  }

  private parsePage(value?: string) {
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

  private parseLimit(value?: string) {
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

  private searchValue(value?: string) {
    const search = value?.trim() ?? '';

    if (search.length > 100) {
      throw new BadRequestException('Kata pencarian terlalu panjang.');
    }

    return search;
  }

  private buildWhere(input: ListInput): Prisma.UserWhereInput {
    const search = this.searchValue(input.search);
    const memberType = this.parseMemberType(input.memberType);
    const verified = this.parseVerified(input.verified);

    return {
      role: Role.PENGUNJUNG,
      ...(memberType ? { memberType } : {}),
      ...(verified === 'VERIFIED'
        ? { emailVerified: true }
        : verified === 'UNVERIFIED'
          ? { emailVerified: false }
          : {}),
      ...(search
        ? {
            OR: [
              {
                name: {
                  contains: search,
                },
              },
              {
                email: {
                  contains: search,
                },
              },
              {
                memberProfile: {
                  is: {
                    whatsapp: {
                      contains: search,
                    },
                  },
                },
              },
            ],
          }
        : {}),
    };
  }

  async list(input: ListInput) {
    const requestedPage = this.parsePage(input.page);
    const limit = this.parseLimit(input.limit);
    const where = this.buildWhere(input);

    const [total, grouped] = await Promise.all([
      this.prisma.user.count({
        where,
      }),
      this.prisma.user.groupBy({
        by: ['memberType'],
        where,
        _count: {
          _all: true,
        },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);

    const users = await this.prisma.user.findMany({
      where,
      orderBy: [
        {
          createdAt: 'desc',
        },
        {
          id: 'desc',
        },
      ],
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        memberType: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        memberProfile: {
          select: {
            whatsapp: true,
          },
        },
        loans: {
          where: {
            status: LoanStatus.AKTIF,
          },
          select: {
            dueAt: true,
          },
        },
      },
    });

    const now = new Date();

    const countType = (type: MemberType) =>
      grouped.find((group) => group.memberType === type)?._count._all ?? 0;

    return {
      stats: {
        total,
        umum: countType(MemberType.UMUM),
        mahasiswa: countType(MemberType.MAHASISWA),
        pegawai: countType(MemberType.PEGAWAI),
      },
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        memberType: user.memberType,
        emailVerified: user.emailVerified,
        isActive: user.isActive,
        whatsapp: user.memberProfile?.whatsapp ?? '',
        activeLoans: user.loans.length,
        overdue: user.loans.filter(
          (loan) => loan.dueAt.getTime() < now.getTime(),
        ).length,
        createdAt: user.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async detail(id: number) {
    const member = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.PENGUNJUNG,
      },
      select: {
        id: true,
        name: true,
        email: true,
        memberType: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        memberProfile: {
          select: {
            whatsapp: true,
            address: true,
            identityNumber: true,
            universityName: true,
            workUnit: true,
          },
        },
        loans: {
          orderBy: {
            borrowedAt: 'desc',
          },
          select: {
            id: true,
            status: true,
            borrowedAt: true,
            dueAt: true,
            returnedAt: true,
            extensionCount: true,
            book: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
            copy: {
              select: {
                code: true,
              },
            },
          },
        },
        reservations: {
          where: {
            status: ReservationStatus.MENUNGGU_PENGAMBILAN,
          },
          orderBy: {
            expiresAt: 'asc',
          },
          select: {
            id: true,
            status: true,
            createdAt: true,
            expiresAt: true,
            book: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
            copy: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!member) {
      throw new NotFoundException('Anggota tidak ditemukan.');
    }

    const now = new Date();

    const activeLoans = member.loans.filter(
      (loan) =>
        loan.status === LoanStatus.AKTIF || loan.status === LoanStatus.HILANG,
    );

    const history = member.loans.filter(
      (loan) => loan.status === LoanStatus.DIKEMBALIKAN,
    );

    return {
      member: {
        id: member.id,
        name: member.name,
        email: member.email,
        memberType: member.memberType,
        emailVerified: member.emailVerified,
        isActive: member.isActive,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
        profile: member.memberProfile,
      },
      summary: {
        activeLoans: activeLoans.filter(
          (loan) => loan.status === LoanStatus.AKTIF,
        ).length,
        overdue: activeLoans.filter(
          (loan) =>
            loan.status === LoanStatus.AKTIF &&
            loan.dueAt.getTime() < now.getTime(),
        ).length,
        activeReservations: member.reservations.length,
        completedLoans: history.length,
      },
      activeLoans,
      activeReservations: member.reservations,
      history,
    };
  }

  private adminMemberInput(body: unknown) {
    const input = objectInput(body);

    const allowed = [
      'name',
      'memberType',
      'whatsapp',
      'address',
      'identityNumber',
      'universityName',
      'workUnit',
    ];

    if (Object.keys(input).some((key) => !allowed.includes(key))) {
      throw new BadRequestException(
        'Terdapat field anggota yang tidak boleh diubah.',
      );
    }

    const name = typeof input.name === 'string' ? input.name.trim() : '';

    if (name.length < 3 || name.length > 191) {
      throw new BadRequestException('Nama anggota tidak valid.');
    }

    const type = input.memberType;

    if (
      type !== MemberType.UMUM &&
      type !== MemberType.MAHASISWA &&
      type !== MemberType.PEGAWAI
    ) {
      throw new BadRequestException('Jenis anggota tidak valid.');
    }

    const whatsapp =
      typeof input.whatsapp === 'string'
        ? input.whatsapp.replace(/[\s-]/g, '').trim()
        : '';

    if (
      !whatsapp ||
      whatsapp.length > 32 ||
      !/^(?:\+?62|0)8\d{7,12}$/.test(whatsapp)
    ) {
      throw new BadRequestException(
        'Nomor WhatsApp tidak valid. Gunakan nomor Indonesia, misalnya 081234567890.',
      );
    }

    const address =
      typeof input.address === 'string' ? input.address.trim() : '';

    if (!address || address.length > 2000) {
      throw new BadRequestException('Alamat tidak valid.');
    }

    const identityNumber =
      typeof input.identityNumber === 'string'
        ? input.identityNumber.trim()
        : '';

    if (!identityNumber || identityNumber.length > 191) {
      throw new BadRequestException('Nomor identitas tidak valid.');
    }

    const universityName =
      typeof input.universityName === 'string'
        ? input.universityName.trim()
        : '';

    const workUnit =
      typeof input.workUnit === 'string' ? input.workUnit.trim() : '';

    if (
      type === MemberType.MAHASISWA &&
      (!universityName || universityName.length > 191)
    ) {
      throw new BadRequestException(
        'Nama universitas wajib diisi untuk mahasiswa.',
      );
    }

    if (type === MemberType.PEGAWAI && (!workUnit || workUnit.length > 191)) {
      throw new BadRequestException(
        'Unit kerja wajib diisi untuk pegawai internal.',
      );
    }

    return {
      name,
      memberType: type,
      whatsapp,
      address,
      identityNumber,
      universityName: type === MemberType.MAHASISWA ? universityName : null,
      workUnit: type === MemberType.PEGAWAI ? workUnit : null,
    };
  }

  async update(id: number, body: unknown) {
    const input = this.adminMemberInput(body);

    const member = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.PENGUNJUNG,
      },
      select: {
        id: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Anggota tidak ditemukan.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: {
          id,
        },
        data: {
          name: input.name,
          memberType: input.memberType,
        },
      });

      await tx.memberProfile.upsert({
        where: {
          userId: id,
        },
        create: {
          userId: id,
          whatsapp: input.whatsapp,
          address: input.address,
          identityNumber: input.identityNumber,
          universityName: input.universityName,
          workUnit: input.workUnit,
        },
        update: {
          whatsapp: input.whatsapp,
          address: input.address,
          identityNumber: input.identityNumber,
          universityName: input.universityName,
          workUnit: input.workUnit,
        },
      });
    });

    return this.detail(id);
  }

  async updateStatus(id: number, body: unknown) {
    const input = objectInput(body);

    if (
      Object.keys(input).length !== 1 ||
      typeof input.isActive !== 'boolean'
    ) {
      throw new BadRequestException('Status anggota tidak valid.');
    }

    const member = await this.prisma.user.findFirst({
      where: {
        id,
        role: Role.PENGUNJUNG,
      },
      select: {
        id: true,
      },
    });

    if (!member) {
      throw new NotFoundException('Anggota tidak ditemukan.');
    }

    const updated = await this.prisma.user.update({
      where: {
        id,
      },
      data: {
        isActive: input.isActive,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
      },
    });

    return {
      member: updated,
    };
  }
}
