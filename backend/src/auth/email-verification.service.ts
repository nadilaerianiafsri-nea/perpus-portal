import {
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

type VerificationPayload = {
  sub: number;
  email: string;
  purpose: string;
  exp: number;
};
const audience = 'perpus-email-verification';
const issuer = 'perpus-api';

@Injectable()
export class EmailVerificationService {
  private readonly resendAttempts = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private secret(): string {
    const secret = this.config.get<string>('EMAIL_VERIFICATION_SECRET');
    if (
      !secret ||
      secret.length < 32 ||
      secret === this.config.get<string>('JWT_SECRET')
    ) {
      throw new ServiceUnavailableException(
        'Layanan verifikasi email belum dikonfigurasi.',
      );
    }
    return secret;
  }

  private async sendLink(user: {
    id: number;
    email: string;
  }): Promise<boolean> {
    if (!this.mail.isConfigured())
      throw new ServiceUnavailableException(
        'Layanan email belum dikonfigurasi.',
      );
    const secret = this.secret();
    const endpoint = this.config.get<string>('EMAIL_VERIFICATION_URL');
    if (!endpoint)
      throw new ServiceUnavailableException(
        'Layanan verifikasi email belum dikonfigurasi.',
      );
    let url: URL;
    try {
      url = new URL(endpoint);
      const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (url.protocol !== 'https:' && !(local && url.protocol === 'http:'))
        throw new Error('Invalid verification endpoint');
      if (url.username || url.password)
        throw new Error('Invalid verification endpoint');
    } catch {
      throw new ServiceUnavailableException(
        'Layanan verifikasi email belum dikonfigurasi.',
      );
    }
    const token = await this.jwt.signAsync(
      { sub: user.id, email: user.email, purpose: 'email-verification' },
      {
        secret,
        algorithm: 'HS256',
        expiresIn: '24h',
        audience,
        issuer,
        jwtid: randomUUID(),
      },
    );
    url.searchParams.set('token', token);
    return this.mail.sendVerificationEmail(user.email, url.toString());
  }

  async sendRegistrationVerification(user: {
    id: number;
    email: string;
  }): Promise<boolean> {
    try {
      return await this.sendLink(user);
    } catch {
      return false;
    }
  }

  async verifyEmail(token: unknown) {
    if (typeof token !== 'string' || !token.trim() || token.length > 4096)
      throw new BadRequestException(
        'Token verifikasi tidak valid atau sudah kedaluwarsa.',
      );
    const secret = this.secret();
    let payload: VerificationPayload;
    try {
      payload = await this.jwt.verifyAsync<VerificationPayload>(token, {
        secret,
        algorithms: ['HS256'],
        audience,
        issuer,
      });
      if (
        payload.purpose !== 'email-verification' ||
        !Number.isSafeInteger(payload.sub) ||
        payload.sub < 1 ||
        typeof payload.email !== 'string' ||
        typeof payload.exp !== 'number'
      )
        throw new Error('Invalid verification claims');
    } catch (error) {
      const expired =
        error instanceof Error && error.name === 'TokenExpiredError';
      throw new BadRequestException({
        message: expired
          ? 'Token verifikasi sudah kedaluwarsa.'
          : 'Token verifikasi tidak valid.',
        code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      });
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user || user.email !== payload.email)
      throw new BadRequestException(
        'Token verifikasi tidak valid atau sudah kedaluwarsa.',
      );
    if (user.emailVerified)
      return {
        message: 'Email sudah diverifikasi.',
        emailVerified: true,
        alreadyVerified: true,
      };
    // The email predicate also prevents verification after a concurrent address change.
    const result = await this.prisma.user.updateMany({
      where: { id: user.id, email: payload.email, emailVerified: false },
      data: { emailVerified: true },
    });
    if (result.count === 0) {
      const current = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { email: true, emailVerified: true },
      });
      if (!current || current.email !== payload.email || !current.emailVerified)
        throw new BadRequestException(
          'Token verifikasi tidak valid atau sudah kedaluwarsa.',
        );
      return {
        message: 'Email sudah diverifikasi.',
        emailVerified: true,
        alreadyVerified: true,
      };
    }
    return {
      message: 'Email berhasil diverifikasi. Anda dapat masuk ke akun.',
      emailVerified: true,
    };
  }

  async resendVerification(body: unknown) {
    const input =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as Record<string, unknown>)
        : {};
    const email =
      typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new BadRequestException('Email tidak valid.');
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user)
      return {
        message: 'Tidak ada akun yang memerlukan verifikasi untuk email ini.',
      };
    if (user.emailVerified) return { message: 'Email sudah diverifikasi.' };
    const now = Date.now();
    if (now - (this.resendAttempts.get(email) ?? 0) < 60000)
      throw new HttpException(
        'Tunggu 60 detik sebelum meminta email verifikasi lagi.',
        429,
      );
    // Bound memory use and reserve before sending to prevent simultaneous resends.
    if (this.resendAttempts.size >= 1000) {
      for (const [key, timestamp] of this.resendAttempts)
        if (now - timestamp >= 60000) this.resendAttempts.delete(key);
      if (this.resendAttempts.size >= 1000)
        throw new HttpException(
          'Layanan sedang sibuk. Silakan coba lagi.',
          429,
        );
    }
    this.resendAttempts.set(email, now);
    try {
      if (!(await this.sendLink(user)))
        throw new ServiceUnavailableException(
          'Email verifikasi belum dapat dikirim. Silakan coba lagi.',
        );
      return {
        message: 'Email verifikasi telah dikirim. Link berlaku selama 24 jam.',
      };
    } catch (error) {
      this.resendAttempts.delete(email);
      throw error;
    }
  }
}
