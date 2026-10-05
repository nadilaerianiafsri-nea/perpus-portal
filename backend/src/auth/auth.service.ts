import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';

import { MemberType, Prisma, Role } from '../generated/prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { EmailVerificationService } from './email-verification.service';

export type SessionPayload = {
  sub: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'PENGUNJUNG';
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly verification: EmailVerificationService,
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

    const token = await this.jwtService.signAsync(payload);

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        memberType: user.memberType ?? null,
      },
    };
  }

  async login(emailInput: string, password: string) {
    const email = emailInput.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Email atau kata sandi salah.');
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      throw new UnauthorizedException('Email atau kata sandi salah.');
    }

    if (!user.emailVerified) {
      throw new ForbiddenException('Akun menunggu verifikasi email.');
    }

    return this.createSession(user);
  }

  async register(body: unknown) {
    const input = RegisterDto.from(body);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existingUser) throw new ConflictException('Email sudah terdaftar.');

    const passwordHash = await bcrypt.hash(input.password, 12);
    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: input.name,
            email: input.email,
            passwordHash,
            memberType: input.memberType,
            role: Role.PENGUNJUNG,
            emailVerified: false,
          },
          select: {
            id: true,
            email: true,
            memberType: true,
            emailVerified: true,
          },
        });
        await tx.memberProfile.create({
          data: {
            userId: created.id,
            whatsapp: input.whatsapp,
            address: input.address,
            identityNumber: input.identity,
            universityName:
              input.memberType === MemberType.MAHASISWA
                ? input.university
                : null,
            workUnit:
              input.memberType === MemberType.PEGAWAI ? input.division : null,
          },
        });
        return created;
      });
      const verificationEmailSent =
        await this.verification.sendRegistrationVerification(user);
      return {
        message: verificationEmailSent
          ? 'Pendaftaran berhasil. Email verifikasi telah dikirim; akun menunggu verifikasi email.'
          : 'Pendaftaran berhasil dan akun menunggu verifikasi email. Email verifikasi belum dapat dikirim.',
        verificationEmailSent,
        data: {
          id: user.id,
          email: user.email,
          memberType: user.memberType,
          emailVerified: user.emailVerified,
        },
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email sudah terdaftar.');
      }
      throw error;
    }
  }

  async verifyEmail(token: unknown) {
    return this.verification.verifyEmail(token);
  }

  async resendVerification(body: unknown) {
    return this.verification.resendVerification(body);
  }

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        memberType: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Sesi tidak valid.');
    }

    if (!user.emailVerified)
      throw new ForbiddenException('Akun menunggu verifikasi email.');
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      memberType: user.memberType,
    };
  }
}
