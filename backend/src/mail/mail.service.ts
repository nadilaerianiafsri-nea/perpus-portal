import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    const port = Number(this.config.get<string>('SMTP_PORT'));
    return (
      !!this.config.get<string>('SMTP_HOST')?.trim() &&
      !!this.config.get<string>('MAIL_FROM')?.trim() &&
      Number.isInteger(port) &&
      port >= 1 &&
      port <= 65535 &&
      !!this.config.get<string>('SMTP_USER') ===
        !!this.config.get<string>('SMTP_PASS')
    );
  }

  async sendVerificationEmail(email: string, link: string): Promise<boolean> {
    return this.send(email, link, false);
  }
  async sendPasswordResetEmail(email: string, link: string): Promise<boolean> {
    return this.send(email, link, true);
  }
  private async send(
    email: string,
    link: string,
    reset: boolean,
  ): Promise<boolean> {
    const host = this.config.get<string>('SMTP_HOST')?.trim() ?? '';
    const port = Number(this.config.get<string>('SMTP_PORT'));
    const from = this.config.get<string>('MAIL_FROM')?.trim();
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    if (!this.isConfigured()) return false;
    const secure =
      this.config.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const local = ['localhost', '127.0.0.1', '::1'].includes(host);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      // Allow the local SMTP capture used in development; require encryption elsewhere.
      requireTLS: !secure && !local,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    const escapedLink = link
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    try {
      const result = await transporter.sendMail({
        from,
        to: email,
        subject: reset
          ? 'Reset Kata Sandi — Perpustakaan Kemenkum Riau'
          : 'Verifikasi Email — Perpustakaan Kemenkum Riau',
        text: reset
          ? `Ubah kata sandi akun Perpustakaan Kemenkum Riau.\n\n${link}\n\nLink berlaku selama 1 jam dan hanya sekali pakai. Jika Anda tidak meminta reset, abaikan email ini.`
          : `Pendaftaran Anda berhasil. Verifikasi alamat email untuk mengaktifkan akun Perpustakaan Kemenkum Riau.\n\n${link}\n\nLink berlaku selama 24 jam. Jika Anda tidak melakukan pendaftaran, abaikan email ini.`,
        html: reset
          ? `<p>Ubah kata sandi akun Perpustakaan Kemenkum Riau.</p><p><a href="${escapedLink}">Reset Kata Sandi</a></p><p>Link berlaku selama 1 jam dan hanya sekali pakai. Jika Anda tidak meminta reset, abaikan email ini.</p>`
          : `<p>Pendaftaran Anda berhasil.</p><p>Verifikasi alamat email untuk mengaktifkan akun Perpustakaan Kemenkum Riau.</p><p><a href="${escapedLink}">Verifikasi Email</a></p><p>Link berlaku selama 24 jam.</p><p>Jika Anda tidak melakukan pendaftaran, abaikan email ini.</p>`,
      });
      return result.accepted.some(
        (recipient) =>
          typeof recipient === 'string' &&
          recipient.toLowerCase() === email.toLowerCase(),
      );
    } catch {
      // Never log SMTP credentials, message contents, or signed verification links.
      return false;
    } finally {
      transporter.close();
    }
  }
}
