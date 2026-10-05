import {
  BadRequestException,
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac, randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

type ResetPayload = {
  sub: number;
  email: string;
  purpose: string;
  fingerprint: string;
  exp: number;
};
@Injectable()
export class PasswordResetService {
  private readonly attempts = new Map<string, number>();
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  private secret() {
    const secret = this.config.get<string>('PASSWORD_RESET_SECRET');
    if (
      !secret ||
      secret.length < 32 ||
      [
        this.config.get('JWT_SECRET'),
        this.config.get('EMAIL_VERIFICATION_SECRET'),
      ].includes(secret)
    )
      throw new ServiceUnavailableException(
        'Layanan reset kata sandi belum dikonfigurasi.',
      );
    return secret;
  }
  private fingerprint(hash: string, secret: string) {
    return createHmac('sha256', secret).update(hash).digest('hex');
  }
  async forgot(body: unknown) {
    const input =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    const email =
      typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    if (email.length > 191 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new BadRequestException('Email tidak valid.');
    const secret = this.secret();
    let url: URL;
    try {
      url = new URL(this.config.get<string>('PASSWORD_RESET_URL') ?? '');
      if (
        url.username ||
        url.password ||
        (url.protocol !== 'https:' &&
          !(
            url.protocol === 'http:' &&
            ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
          ))
      )
        throw new Error();
    } catch {
      throw new ServiceUnavailableException(
        'Layanan reset kata sandi belum dikonfigurasi.',
      );
    }
    const now = Date.now();
    for (const [key, time] of this.attempts)
      if (now - time >= 60000) this.attempts.delete(key);
    if (this.attempts.has(email) || this.attempts.size >= 1000)
      throw new HttpException(
        'Tunggu 60 detik sebelum meminta reset lagi.',
        429,
      );
    this.attempts.set(email, now);
    const message =
      'Jika email terdaftar, link reset kata sandi akan dikirim. Link berlaku selama 1 jam.';
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message };
    const token = await this.jwt.signAsync(
      {
        sub: user.id,
        email,
        purpose: 'password-reset',
        fingerprint: this.fingerprint(user.passwordHash, secret),
      },
      {
        secret,
        algorithm: 'HS256',
        expiresIn: '1h',
        audience: 'perpus-password-reset',
        issuer: 'perpus-api',
        jwtid: randomUUID(),
      },
    );
    url.searchParams.set('token', token);
    if (!(await this.mail.sendPasswordResetEmail(email, url.toString()))) {
      this.attempts.delete(email);
      throw new ServiceUnavailableException(
        'Email reset belum dapat dikirim. Silakan coba lagi.',
      );
    }
    return { message };
  }
  async reset(body: unknown) {
    const input =
      body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
    if (
      typeof input.password !== 'string' ||
      input.password.length < 8 ||
      Buffer.byteLength(input.password, 'utf8') > 72
    )
      throw new BadRequestException(
        'Kata sandi minimal 8 karakter dan maksimal 72 byte.',
      );
    if (
      typeof input.token !== 'string' ||
      !input.token ||
      input.token.length > 4096
    )
      throw new BadRequestException(
        'Token reset tidak valid atau sudah kedaluwarsa.',
      );
    const secret = this.secret();
    let payload: ResetPayload;
    try {
      payload = await this.jwt.verifyAsync<ResetPayload>(input.token, {
        secret,
        algorithms: ['HS256'],
        audience: 'perpus-password-reset',
        issuer: 'perpus-api',
      });
      if (
        payload.purpose !== 'password-reset' ||
        !Number.isSafeInteger(payload.sub) ||
        payload.sub < 1 ||
        typeof payload.exp !== 'number' ||
        typeof payload.fingerprint !== 'string'
      )
        throw new Error();
    } catch {
      throw new BadRequestException(
        'Token reset tidak valid atau sudah kedaluwarsa.',
      );
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (
      !user ||
      user.email !== payload.email ||
      payload.fingerprint !== this.fingerprint(user.passwordHash, secret)
    )
      throw new BadRequestException(
        'Token reset tidak valid atau sudah digunakan.',
      );
    const passwordHash = await bcrypt.hash(input.password, 12);
    // Compare-and-swap consumes all outstanding reset links, including concurrent requests.
    const result = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
      },
      data: { passwordHash },
    });
    if (!result.count)
      throw new BadRequestException('Token reset sudah digunakan.');
    return { message: 'Kata sandi berhasil diubah. Silakan masuk kembali.' };
  }
}
