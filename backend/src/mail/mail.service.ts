import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';
import { serviceInfo } from '../../../shared/serviceInfo.cjs';
import type { ContactInput } from '../../../shared/contactValidation.cjs';

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
  async sendContactEmail(input: ContactInput): Promise<boolean> {
    const recipient =
      this.config.get<string>('CONTACT_RECIPIENT_EMAIL')?.trim() ||
      serviceInfo.email;
    if (!/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(recipient)) return false;
    const escape = (value: string) =>
      value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    return this.deliver({
      to: recipient,
      replyTo: { address: input.email, name: input.name },
      subject: `Pesan Website Perpustakaan — ${input.name}`,
      text: `Pesan Baru dari Website Perpustakaan Kemenkum Riau\n\nNama:\n${input.name}\n\nEmail:\n${input.email}\n\nPesan:\n${input.message}\n\n----------------------------------------\n\nPesan ini dikirim melalui formulir Kontak website Perpustakaan Kemenkum Riau.\n\nGunakan tombol Balas pada email untuk membalas langsung kepada pengirim.`,
      html: `<h2>Perpustakaan Kemenkum Riau</h2><h3>Pesan Baru dari Website</h3><p><strong>Nama</strong><br>${escape(input.name)}</p><p><strong>Email</strong><br>${escape(input.email)}</p><p><strong>Pesan</strong><br>${escape(input.message).replaceAll('\n', '<br>')}</p><hr><p>Pesan ini dikirim melalui formulir Kontak website Perpustakaan Kemenkum Riau.</p><p>Klik Balas untuk membalas langsung kepada pengirim.</p>`,
    });
  }
  private async send(
    email: string,
    link: string,
    reset: boolean,
  ): Promise<boolean> {
    const escapedLink = link
      .replaceAll('&', '&amp;')
      .replaceAll('"', '&quot;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
    return this.deliver({
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
