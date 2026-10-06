import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { serviceInfo } from '../../../shared/serviceInfo.cjs';
import type { ContactInput } from '../../../shared/contactValidation.cjs';
import {
  emailTemplate,
  loanReminderTemplate,
  type LoanReminderDetails,
} from './mail-template';

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

  async sendMemberReminder(
    email: string,
    title: string,
    message: string,
    details?: LoanReminderDetails,
  ): Promise<boolean> {
    return this.deliver({
      to: email,
      subject: `${title} — Perpustakaan Kemenkum Riau`,
      ...loanReminderTemplate(
        title,
        message,
        details,
        this.memberDashboardUrl(),
      ),
    });
  }
  async sendContactEmail(input: ContactInput): Promise<boolean> {
    const recipient =
      this.config.get<string>('CONTACT_RECIPIENT_EMAIL')?.trim() ||
      serviceInfo.email;
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient)) return false;
    return this.deliver({
      to: recipient,
      replyTo: { address: input.email, name: input.name },
      subject: `Pesan Website Perpustakaan — ${input.name}`,
      ...emailTemplate({
        badge: 'PESAN KONTAK',
        heading: 'Pesan Baru dari Website',
        paragraphs: [
          'Pesan baru diterima melalui formulir Kontak. Silakan tinjau informasi pengirim dan isi pesan berikut.',
        ],
        details: [
          { label: 'Nama', value: input.name },
          { label: 'Email', value: input.email },
          { label: 'Pesan', value: input.message },
        ],
        action: {
          label: 'Balas Pengirim',
          url: `mailto:${encodeURIComponent(input.email)}`,
        },
        contact: true,
      }),
    });
  }
  private async send(
    email: string,
    link: string,
    reset: boolean,
  ): Promise<boolean> {
    return this.deliver({
      to: email,
      subject: reset
        ? 'Reset Kata Sandi — Perpustakaan Kemenkum Riau'
        : 'Verifikasi Email — Perpustakaan Kemenkum Riau',
      ...emailTemplate({
        badge: reset ? 'KEAMANAN AKUN' : 'AKTIVASI AKUN',
        heading: reset
          ? 'Atur Ulang Kata Sandi'
          : 'Selamat Datang di Perpustakaan Kemenkum Riau',
        paragraphs: reset
          ? [
              'Kami menerima permintaan untuk mengatur ulang kata sandi akun Anda.',
            ]
          : [
              'Pendaftaran akun Anda berhasil.',
              'Untuk mengaktifkan akun dan mulai menggunakan layanan perpustakaan, silakan verifikasi alamat email Anda.',
            ],
        action: {
          label: reset ? 'Atur Ulang Kata Sandi' : 'Verifikasi Email',
          url: link,
        },
        alert: reset
          ? 'Link berlaku selama 1 jam dan hanya sekali pakai.'
          : 'Link berlaku selama 24 jam.',
        note: reset
          ? 'Jika Anda tidak meminta perubahan kata sandi, abaikan email ini.'
          : 'Jika Anda tidak melakukan pendaftaran ini, abaikan email ini.',
      }),
    });
  }
  private memberDashboardUrl(): string | undefined {
    const endpoint =
      this.config.get<string>('FRONTEND_URL')?.split(',')[0]?.trim() ||
      this.config.get<string>('EMAIL_VERIFICATION_URL');
    try {
      const url = new URL('/dashboard/pinjaman', endpoint);
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password
      )
        return undefined;
      return url.toString();
    } catch {
      return undefined;
    }
  }
  private async deliver(
    options: Mail.Options & { to: string },
  ): Promise<boolean> {
    if (!this.isConfigured()) return false;
    const host = this.config.get<string>('SMTP_HOST')?.trim() ?? '';
    const port = Number(this.config.get<string>('SMTP_PORT'));
    const from = this.config.get<string>('MAIL_FROM')?.trim();
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');
    const secure =
      this.config.get<string>('SMTP_SECURE') === 'true' || port === 465;
    const local = ['localhost', '127.0.0.1', '::1'].includes(host);
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      requireTLS: !secure && !local,
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 10000,
      disableFileAccess: true,
      disableUrlAccess: true,
    });
    try {
      const result = await transporter.sendMail({ ...options, from });
      return result.accepted.some(
        (recipient) =>
          typeof recipient === 'string' &&
          recipient.toLowerCase() === options.to.toLowerCase(),
      );
    } catch {
      // Never log SMTP credentials, message contents, or signed verification links.
      return false;
    } finally {
      transporter.close();
    }
  }
}
