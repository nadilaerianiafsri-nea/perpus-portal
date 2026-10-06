import { BadRequestException } from '@nestjs/common';

export function objectInput(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new BadRequestException('Data tidak valid.');
  return body as Record<string, unknown>;
}

export function positiveId(value: unknown): number {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    !/^\d+$/.test(String(value)) ||
    !Number.isSafeInteger(Number(value)) ||
    Number(value) < 1 ||
    Number(value) > 2147483647
  )
    throw new BadRequestException('ID tidak valid.');
  return Number(value);
}

export function bookInput(body: unknown): number {
  const input = objectInput(body);
  if (Object.keys(input).some((key) => key !== 'bookId'))
    throw new BadRequestException('Hanya bookId yang boleh ditentukan.');
  return positiveId(input.bookId);
}

export function extensionInput(body: unknown): Date {
  const input = objectInput(body);
  const value = input.expectedDueAt;
  if (
    Object.keys(input).some((key) => key !== 'expectedDueAt') ||
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  )
    throw new BadRequestException(
      'Tanggal jatuh tempo konfirmasi tidak valid.',
    );
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value)
    throw new BadRequestException(
      'Tanggal jatuh tempo konfirmasi tidak valid.',
    );
  return date;
}

export function profileInput(body: unknown, memberType: string | null) {
  const input = objectInput(body);
  const allowed = [
    'name',
    'whatsapp',
    'address',
    ...(memberType === 'MAHASISWA' ? ['universityName'] : []),
    ...(memberType === 'PEGAWAI' ? ['workUnit'] : []),
  ];
  if (
    !Object.keys(input).length ||
    Object.keys(input).some((key) => !allowed.includes(key))
  )
    throw new BadRequestException(
      'Field ini tidak boleh diubah melalui profil anggota.',
    );
  const result: Record<string, string> = {};
  for (const key of Object.keys(input)) {
    const value = input[key];
    const max = key === 'address' ? 2000 : key === 'whatsapp' ? 32 : 191;
    if (
      typeof value !== 'string' ||
      !value.trim() ||
      value.trim().length > max ||
      (key === 'name' && value.trim().length < 3)
    )
      throw new BadRequestException(
        `Data ${key === 'whatsapp' ? 'WhatsApp' : key === 'name' ? 'nama' : key === 'address' ? 'alamat' : 'profil'} tidak valid.`,
      );
    result[key] = value.trim();
  }
  if (
    result.whatsapp &&
    !/^(?:\+?62|0)8\d{7,12}$/.test(result.whatsapp.replace(/[\s-]/g, ''))
  )
    throw new BadRequestException(
      'Nomor WhatsApp tidak valid. Gunakan nomor Indonesia, misalnya 081234567890.',
    );
  if (result.whatsapp) result.whatsapp = result.whatsapp.replace(/[\s-]/g, '');
  return result;
}

const day = 86400000;
// Jakarta has no DST. Compare calendar days, keeping deadlines stored as UTC instants.
export function jakartaDay(value: Date): number {
  return Math.floor((value.getTime() + 7 * 3600000) / day);
}

export function reminderMilestone(dueAt: Date, now: Date): number | null {
  const difference = jakartaDay(now) - jakartaDay(dueAt);
  return difference === -1 ||
    difference === 0 ||
    (difference > 0 && difference % 2 === 1)
    ? difference
    : null;
}
