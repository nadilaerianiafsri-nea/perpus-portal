import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

import {
  MemberType,
  Role,
} from '../../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';

export type SessionPayload = {
  sub: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'PENGUNJUNG';
};

type RegisterInput = {
  name: string;
  email: string;
  password: string;
  memberType: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private async createSession(user: {
    id: number;
    name: string;
    email: string;
    role: Role;
    memberType?: MemberType | null;
  }) {
    const payload: SessionPayload = {
      sub: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    const token =
      await this.jwtService.signAsync(
        payload,
      );

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        memberType:
          user.memberType ?? null,
      },
    };
  }

  async login(
    emailInput: string,
    password: string,
  ) {
    const email =
      emailInput
        .trim()
        .toLowerCase();

    const user =
      await this.prisma.user.findUnique({
        where: { email },
      });

    if (!user) {
      throw new UnauthorizedException(
        'Email atau kata sandi salah.',
      );
    }

    const validPassword =
      await bcrypt.compare(
        password,
        user.passwordHash,
      );

    if (!validPassword) {
      throw new UnauthorizedException(
        'Email atau kata sandi salah.',
      );
    }

    return this.createSession(user);
  }

  async register(
    input: RegisterInput,
  ) {
    const name =
      input.name?.trim();

    const email =
      input.email
        ?.trim()
        .toLowerCase();

    const password =
      input.password ?? '';

    if (
      !name ||
      name.length < 3
    ) {
      throw new BadRequestException(
        'Nama lengkap minimal 3 karakter.',
      );
    }

    if (
      !email ||
      !email.includes('@')
    ) {
      throw new BadRequestException(
        'Email tidak valid.',
      );
    }

    if (
      password.length < 8
    ) {
      throw new BadRequestException(
        'Kata sandi minimal 8 karakter.',
      );
    }

    const memberTypeMap: Record<
      string,
      MemberType
    > = {
      umum: MemberType.UMUM,
      mahasiswa:
        MemberType.MAHASISWA,
      pegawai:
        MemberType.PEGAWAI,
    };

    const memberType =
      memberTypeMap[
        input.memberType
          ?.trim()
          .toLowerCase()
      ];

    if (!memberType) {
      throw new BadRequestException(
        'Jenis keanggotaan tidak valid.',
      );
    }

    const existingUser =
      await this.prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });

    if (existingUser) {
      throw new ConflictException(
        'Email sudah terdaftar.',
      );
    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12,
      );

    const user =
      await this.prisma.user.create({
        data: {
          name,
          email,
          passwordHash,
          memberType,
          role: Role.PENGUNJUNG,
        },
      });

    return this.createSession(user);
  }

  async getUserById(
    id: number,
  ) {
    const user =
      await this.prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          memberType: true,
        },
      });

    if (!user) {
      throw new UnauthorizedException(
        'Sesi tidak valid.',
      );
    }

    return user;
  }
}
