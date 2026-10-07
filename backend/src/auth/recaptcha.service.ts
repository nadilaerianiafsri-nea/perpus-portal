import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RecaptchaService {
  constructor(private readonly config: ConfigService) {}

  private hasLocalFrontend(): boolean {
    const origins = this.config.get<string>('FRONTEND_URL') ?? '';

    const configuredOrigins = origins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!configuredOrigins.length) {
      return false;
    }

    return configuredOrigins.every((origin) => {
      try {
        const url = new URL(origin);

        if (!['http:', 'https:'].includes(url.protocol)) {
          return false;
        }

        return (
          url.hostname === 'localhost' ||
          url.hostname === '127.0.0.1' ||
          url.hostname === '::1'
        );
      } catch {
        return false;
      }
    });
  }

  async verify(token: unknown): Promise<void> {
    const secret = this.config.get<string>('RECAPTCHA_SECRET_KEY')?.trim();
    const environment = (
      this.config.get<string>('NODE_ENV') ??
      process.env.NODE_ENV ??
      ''
    )
      .trim()
      .toLowerCase();

    if (!secret) {
      const developmentMode =
        environment === 'development' || environment === 'test';

      // Local development may run without Google reCAPTCHA credentials.
      // FRONTEND_URL is also checked so an inherited/global NODE_ENV value
      // cannot accidentally block a localhost-only development setup.
      if (developmentMode || this.hasLocalFrontend()) {
        return;
      }

      throw new ServiceUnavailableException({
        code: 'CAPTCHA_UNAVAILABLE',
        message:
          'Verifikasi keamanan belum tersedia. Silakan coba lagi nanti.',
      });
    }

    if (
      typeof token !== 'string' ||
      !token.trim() ||
      token.length > 8192
    ) {
      throw new BadRequestException({
        code: 'CAPTCHA_REQUIRED',
        message: 'Selesaikan CAPTCHA sebelum masuk.',
      });
    }

    let hostnames: string[];

    try {
      const origins = this.config.get<string>('FRONTEND_URL');

      hostnames = (origins ?? '')
        .split(',')
        .filter((origin) => origin.trim())
        .map((origin) => {
          const url = new URL(origin.trim());

          if (!['https:', 'http:'].includes(url.protocol)) {
            throw new Error('Invalid origin');
          }

          return url.hostname;
        });

      if (!hostnames.length) {
        throw new Error('Missing origin');
      }
    } catch {
      throw new ServiceUnavailableException({
        code: 'CAPTCHA_UNAVAILABLE',
        message:
          'Verifikasi keamanan belum tersedia. Silakan coba lagi nanti.',
      });
    }

    let result: unknown;

    try {
      const response = await fetch(
        'https://www.google.com/recaptcha/api/siteverify',
        {
          method: 'POST',
          body: new URLSearchParams({
            secret,
            response: token,
          }),
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) {
        throw new Error('Verification unavailable');
      }

      result = await response.json();
    } catch {
      throw new ServiceUnavailableException({
        code: 'CAPTCHA_UNAVAILABLE',
        message:
          'Verifikasi keamanan tidak dapat dihubungi. Silakan coba lagi.',
      });
    }

    const verification = result as {
      success?: unknown;
      hostname?: unknown;
    } | null;

    if (
      verification?.success !== true ||
      typeof verification.hostname !== 'string' ||
      !hostnames.includes(verification.hostname)
    ) {
      throw new BadRequestException({
        code: 'CAPTCHA_INVALID',
        message:
          'CAPTCHA tidak valid atau sudah kedaluwarsa. Silakan verifikasi kembali.',
      });
    }
  }
}
