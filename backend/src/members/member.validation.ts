import { BadRequestException } from '@nestjs/common';
import { textInputError } from '../../../shared/inputValidation.cjs';

export function objectInput(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new BadRequestException('Data tidak valid.');
  return body as Record<string, unknown>;
}

export function emptyInput(body: unknown): void {
  if (body === undefined) return;
  if (Object.keys(objectInput(body)).length)
    throw new BadRequestException('Endpoint ini tidak menerima field tambahan.');
}

export function memberText(value: unknown, max: number, required = false, multiline = false): string {
  const error = textInputError(value, { max, required, multiline });
  if (error) throw new BadRequestException(error);
  return (value as string).trim();
}

// Express can supply repeated query parameters as arrays. Validate before any
// parsing or Prisma work, and preserve search punctuation as ordinary data.
export function memberQuery(body: unknown, allowed: readonly string[]): Record<string, string> {
  const input = objectInput(body);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.includes(key)) throw new BadRequestException('Parameter tidak dikenal.');
    if (value === undefined) continue;
    result[key] = memberText(value, key === 'search' ? 100 : 32);
    if (key === 'page' || key === 'limit') {
      const number = positiveId(result[key]);
      if (key === 'limit' && number > 100) throw new BadRequestException('Batas data tidak valid.');
    }
  }
  return result;
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

export function ebookProgressInput(body: unknown) {
  const input = objectInput(body);
  const { progress, lastPosition, expectedVersion } = input;
  if (
    Object.keys(input).some(
      (key) => !['progress', 'lastPosition', 'expectedVersion'].includes(key),
    ) ||
    typeof progress !== 'number' ||
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 100 ||
    typeof lastPosition !== 'number' ||
    !Number.isFinite(lastPosition) ||
    lastPosition < 0 ||
    lastPosition > 1 ||
    typeof expectedVersion !== 'number' ||
    !Number.isSafeInteger(expectedVersion) ||
    expectedVersion < 0 ||
    expectedVersion > 2147483646
  )
    throw new BadRequestException('Progres atau posisi baca tidak valid.');
  return { progress, lastPosition, expectedVersion };
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
    memberText(value, max, true, key === 'address');
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
  return difference === -1 || difference === 0 || difference >= 2
    ? difference
    : null;
}
