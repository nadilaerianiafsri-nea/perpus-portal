import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { textInputError } from '../../../shared/inputValidation.cjs';
import { Role } from '../generated/prisma/client';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { authObject, authToken } from './input-validation';

type AdminPasswordChangePayload = {
  sub: number;
  email: string;
  purpose: string;
  fingerprint: string;
  exp: number;
};

const passwordChangeAudience = 'perpus-admin-password-change';
const issuer = 'perpus-api';

@Injectable()
export class AdminProfileService {
  private readonly passwordChangeAttempts = new Map<number, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private passwordSecret() {
    const secret = this.config.get<string>('PASSWORD_RESET_SECRET');
    if (
      !secret ||
      secret.length < 32 ||
      [
        this.config.get<string>('JWT_SECRET'),
        this.config.get<string>('EMAIL_VERIFICATION_SECRET'),
      ].includes(secret)
    ) {
      throw new ServiceUnavailableException(
        'Layanan verifikasi ganti password belum dikonfigurasi.',
      );
    }
    return secret;
  }

  private fingerprint(passwordHash: string, secret: string) {
    return createHmac('sha256', secret).update(passwordHash).digest('hex');
  }

  private profileUrl(token: string) {
    const endpoint =
      this.config.get<string>('FRONTEND_URL')?.split(',')[0]?.trim() ||
      this.config.get<string>('EMAIL_VERIFICATION_URL')?.trim();
    let url: URL;
    try {
      url = new URL('/admin/profil', endpoint);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (
        (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
        url.username ||
        url.password
      ) {
        throw new Error();
      }
    } catch {
      throw new ServiceUnavailableException(
        'URL profil admin belum dikonfigurasi.',
      );
    }
    url.searchParams.set('passwordChangeToken', token);
    return url.toString();
  }

  private async adminAccount(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        emailVerified: true,
      },
    });
    if (!user || user.role !== Role.ADMIN)
      throw new ForbiddenException('Akses profil admin tidak diizinkan.');
    return user;
  }

  async updateProfile(userId: number, body: unknown) {
    const input = authObject(body, ['name']);
    const error = textInputError(input.name, { required: true, max: 191 });
    if (error) throw new BadRequestException(error);
    const name = (input.name as string).trim();
    if (name.length < 3)
      throw new BadRequestException('Nama lengkap minimal 3 karakter.');

    await this.adminAccount(userId);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { name },
      select: { id: true, name: true, email: true, role: true },
    });
    return { user };
  }

  async requestPasswordChange(userId: number, body: unknown) {
    const input = authObject(body, ['currentPassword']);
    if (
      typeof input.currentPassword !== 'string' ||
      !input.currentPassword ||
      Buffer.byteLength(input.currentPassword, 'utf8') > 72
    ) {
      throw new BadRequestException('Password saat ini tidak valid.');
    }

    const user = await this.adminAccount(userId);
    if (!user.emailVerified)
      throw new ForbiddenException('Email admin belum terverifikasi.');

    const validPassword = await bcrypt.compare(
      input.currentPassword,
      user.passwordHash,
    );
    if (!validPassword)
      throw new BadRequestException('Password saat ini tidak sesuai.');

    const now = Date.now();
    for (const [key, timestamp] of this.passwordChangeAttempts)
      if (now - timestamp >= 60000) this.passwordChangeAttempts.delete(key);
    if (now - (this.passwordChangeAttempts.get(userId) ?? 0) < 60000)
      throw new HttpException(
        'Tunggu 60 detik sebelum meminta email verifikasi lagi.',
        429,
      );
    if (this.passwordChangeAttempts.size >= 1000)
      throw new HttpException(
        'Layanan sedang sibuk. Silakan coba lagi.',
        429,
      );

    const secret = this.passwordSecret();
    const token = await this.jwt.signAsync(
      {
        sub: user.id,
        email: user.email,
        purpose: 'admin-password-change',
        fingerprint: this.fingerprint(user.passwordHash, secret),
      },
      {
        secret,
        algorithm: 'HS256',
        expiresIn: '15m',
        audience: passwordChangeAudience,
        issuer,
        jwtid: randomUUID(),
      },
    );

    this.passwordChangeAttempts.set(userId, now);
    try {
      const sent = await this.mail.sendAdminPasswordChangeEmail(
        user.email,
        this.profileUrl(token),
      );
      if (!sent)
        throw new ServiceUnavailableException(
          'Email verifikasi belum dapat dikirim. Silakan coba lagi.',
        );
    } catch (error) {
      this.passwordChangeAttempts.delete(userId);
      throw error;
    }

    return {
      message:
        'Link verifikasi telah dikirim ke email admin. Link berlaku selama 15 menit.',
    };
  }

  async confirmPasswordChange(userId: number, body: unknown) {
    const input = authObject(body, ['token', 'password', 'confirmPassword']);
    if (
      typeof input.password !== 'string' ||
      input.password.length < 8 ||
      Buffer.byteLength(input.password, 'utf8') > 72
    ) {
      throw new BadRequestException(
        'Kata sandi minimal 8 karakter dan maksimal 72 byte.',
      );
    }
    if (
      typeof input.confirmPassword !== 'string' ||
      input.confirmPassword !== input.password
    ) {
      throw new BadRequestException('Konfirmasi password baru tidak sama.');
    }
    if (!authToken(input.token))
      throw new BadRequestException(
        'Link verifikasi tidak valid atau sudah kedaluwarsa.',
      );

    const secret = this.passwordSecret();
    let payload: AdminPasswordChangePayload;
    try {
      payload = await this.jwt.verifyAsync<AdminPasswordChangePayload>(
        input.token,
        {
          secret,
          algorithms: ['HS256'],
          audience: passwordChangeAudience,
          issuer,
        },
      );
      if (
        payload.purpose !== 'admin-password-change' ||
        payload.sub !== userId ||
        !Number.isSafeInteger(payload.sub) ||
        payload.sub < 1 ||
        typeof payload.email !== 'string' ||
        typeof payload.fingerprint !== 'string' ||
        !/^[a-f0-9]{64}$/.test(payload.fingerprint) ||
        !Number.isSafeInteger(payload.exp)
      ) {
        throw new Error();
      }
    } catch (error) {
      const expired =
        error instanceof Error && error.name === 'TokenExpiredError';
      throw new BadRequestException(
        expired
          ? 'Link verifikasi sudah kedaluwarsa. Kirim verifikasi baru.'
          : 'Link verifikasi tidak valid.',
      );
    }

    const user = await this.adminAccount(userId);
    if (
      user.email !== payload.email ||
      payload.fingerprint !== this.fingerprint(user.passwordHash, secret)
    ) {
      throw new BadRequestException(
        'Link verifikasi tidak valid atau sudah digunakan.',
      );
    }

    if (await bcrypt.compare(input.password, user.passwordHash))
      throw new BadRequestException(
        'Password baru harus berbeda dari password saat ini.',
      );

    const passwordHash = await bcrypt.hash(input.password, 12);
    const result = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        email: user.email,
        role: Role.ADMIN,
        passwordHash: user.passwordHash,
      },
      data: { passwordHash },
    });
    if (!result.count)
      throw new BadRequestException(
        'Link verifikasi sudah digunakan atau data akun berubah.',
      );

    this.passwordChangeAttempts.delete(userId);
    return {
      message: 'Password berhasil diperbarui. Silakan login kembali.',
    };
  }
}
