import { BadRequestException } from '@nestjs/common';
import { RegisterDto } from './dto/register.dto';
import { PasswordResetService } from './password-reset.service';
import { EmailVerificationService } from './email-verification.service';
import { CollectionsService } from '../collections/collections.service';
import { GrantsService } from '../grants/grants.service';
import { ContactDto } from '../contact/contact.dto';

const valid = { name: "O'Connor", email: 'member@example.com', whatsapp: '+6281234', address: 'R&D / Hukum & HAM', identity: "' OR 1=1 --", password: " <A&'bcdef> ", confirmPassword: " <A&'bcdef> ", memberType: 'umum', consent: true };
describe('Public input security boundaries', () => {
  it.each(['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<b>nama</b>', '&lt;svg onload=alert(1)&gt;'])('rejects markup in registration before persistence: %s', (name) => {
    expect(() => RegisterDto.from({ ...valid, name })).toThrow(BadRequestException);
  });
  it.each([{ arbitrary: 'ignored' }, { isActive: true }, { university: '<svg/onload=alert(1)>' }, { division: ['nested'] }])('rejects unknown keys and invalid inactive registration fields', (extra) => {
    expect(() => RegisterDto.from({ ...valid, ...extra })).toThrow(BadRequestException);
  });
  it('preserves punctuation, SQL-looking text and every password byte', () => {
    const dto = RegisterDto.from(valid);
    expect(dto.name).toBe(valid.name); expect(dto.address).toBe(valid.address); expect(dto.identity).toBe(valid.identity); expect(dto.password).toBe(valid.password);
  });
  it.each([{ email: 'member@example.com', role: 'ADMIN' }, { email: '<b>x</b>@example.com' }, ['member@example.com']])('rejects recovery/resend payloads before configuration, DB or email', async (body) => {
    const forgot = new PasswordResetService({} as never, {} as never, {} as never, {} as never);
    const resend = new EmailVerificationService({} as never, {} as never, {} as never, {} as never);
    await expect(forgot.forgot(body)).rejects.toBeInstanceOf(BadRequestException);
    await expect(resend.resendVerification(body)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('rejects reset unknown keys before verifying a token or hashing', async () => {
    const reset = new PasswordResetService({} as never, {} as never, {} as never, {} as never);
    await expect(reset.reset({ token: 'a.b.c', password: valid.password, role: 'ADMIN' })).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([{ search: '<b>book</b>' }, { search: '&lt;img src=x&gt;' }, { subject: ['<svg/onload=alert(1)>'] }, { language: '<em>id</em>' }, { unknown: 'x' }, { type: ['EBOOK', 1] }])('rejects catalog HTML, unknown query keys and nested types before database work', async (query) => {
    const collections = new CollectionsService({} as never, {} as never);
    await expect(collections.list(query)).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([{ search: '<b>book</b>' }, { search: '&lt;svg&gt;' }, { extra: 'x' }, { search: ['x'] }])('rejects grant HTML and invalid query shapes before database work', async (query) => {
    const grants = new GrantsService({} as never);
    await expect(grants.list(query)).rejects.toBeInstanceOf(BadRequestException);
  });
  it.each([{ name: '<b>nama</b>' }, { message: '<img src=x>' }, { unknown: true }, { name: 'Nama\r\nBcc: other@example.com' }])('rejects contact markup and email header injection', (extra) => {
    expect(() => ContactDto.from({ name: "O'Connor", email: 'member@example.com', message: "R&D / ' OR 1=1 --", ...extra })).toThrow(BadRequestException);
  });
});
