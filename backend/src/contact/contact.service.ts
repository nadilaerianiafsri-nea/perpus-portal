import {
  HttpException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { ContactDto } from './contact.dto';

@Injectable()
export class ContactService {
  private readonly attempts = new Map<string, number>();
  constructor(private readonly mail: MailService) {}

  async send(body: unknown) {
    const input = ContactDto.from(body);
    const now = Date.now();
    for (const [key, time] of this.attempts)
      if (now - time >= 60000) this.attempts.delete(key);
    if (this.attempts.has(input.email) || this.attempts.size >= 1000)
      throw new HttpException(
        'Tunggu 60 detik sebelum mengirim pesan lagi.',
        429,
      );
    this.attempts.set(input.email, now);
    if (!(await this.mail.sendContactEmail(input)))
      throw new ServiceUnavailableException({
        code: 'CONTACT_SEND_FAILED',
        message: 'Pesan belum dapat dikirim. Silakan coba lagi.',
      });
    return { success: true, message: 'Pesan berhasil dikirim.' };
  }
}
