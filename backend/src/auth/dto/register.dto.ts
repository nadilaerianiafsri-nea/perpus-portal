import { BadRequestException } from '@nestjs/common';
import { MemberType } from '../../generated/prisma/client';

// Uses the existing explicit NestJS validation mechanism; no second validation library.
export class RegisterDto {
  name: string;
  email: string;
  whatsapp: string;
  address: string;
  identity: string;
  password: string;
  memberType: MemberType;
  university?: string;
  division?: string;

  static from(body: unknown): RegisterDto {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Data registrasi harus berupa object.');
    }
    const input = body as Record<string, unknown>;
    const errors: Record<string, string> = {};
    const text = (key: string, max = 191): string => {
      const value = input[key];
      if (typeof value !== 'string' || !value.trim()) {
        errors[key] = 'Field ini wajib diisi sebagai teks.';
        return '';
      }
      const trimmed = value.trim();
      if (trimmed.length > max) errors[key] = `Maksimal ${max} karakter.`;
      return trimmed;
    };
    const dto = new RegisterDto();
    dto.name = text('name');
    if (dto.name && dto.name.length < 3)
      errors.name = 'Nama lengkap minimal 3 karakter.';
    dto.email = text('email').toLowerCase();
    if (dto.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dto.email))
      errors.email = 'Email tidak valid.';
    dto.whatsapp = text('whatsapp', 32);
    dto.address = text('address', 2000);
    dto.identity = text('identity');
    const type = text('memberType').toUpperCase();
    if (
      type === MemberType.UMUM ||
      type === MemberType.MAHASISWA ||
      type === MemberType.PEGAWAI
    )
      dto.memberType = type;
    else errors.memberType = 'Jenis keanggotaan tidak valid.';
    if (dto.memberType === MemberType.MAHASISWA)
      dto.university = text('university');
    if (dto.memberType === MemberType.PEGAWAI) dto.division = text('division');
    dto.password = typeof input.password === 'string' ? input.password : '';
    if (dto.password.length < 8)
      errors.password = 'Kata sandi minimal 8 karakter.';
    // bcrypt only hashes the first 72 bytes; reject values it would silently truncate.
    if (Buffer.byteLength(dto.password, 'utf8') > 72)
      errors.password = 'Kata sandi maksimal 72 byte.';
    if (
      input.confirmPassword !== undefined &&
      input.confirmPassword !== dto.password
    )
      errors.confirmPassword = 'Konfirmasi kata sandi tidak sama.';
    if (input.consent !== undefined && input.consent !== true)
      errors.consent =
        'Persetujuan Syarat Layanan dan Kebijakan Privasi diperlukan.';
    for (const key of ['role', 'emailVerified', 'passwordHash', 'id']) {
      if (Object.hasOwn(input, key))
        errors[key] =
          'Field ini tidak boleh ditentukan melalui registrasi publik.';
    }
    if (Object.keys(errors).length)
      throw new BadRequestException({
        message: 'Data registrasi tidak valid.',
        errors,
      });
    return dto;
  }
}
