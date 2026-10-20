import { BadRequestException } from '@nestjs/common';
import { getChartGranularity, type ChartGranularity } from '../../../shared/chartTime.cjs';

export type LibrarySettings = {
  libraryName: string;
  address: string;
  serviceHours: string;
  phoneE164: string;
  reservationDurationHours: number;
  loanDurationDays: number;
  extensionDurationDays: number;
  maxExtensions: number | null;
};

export type NotificationChannel = 'ALL' | 'EMAIL' | 'WHATSAPP';

const HTML_TOKEN = /[<>]/;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function objectInput(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException('Data pengaturan tidak valid.');
  }
  return body as Record<string, unknown>;
}

function plainText(
  value: unknown,
  label: string,
  min: number,
  max: number,
): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${label} tidak valid.`);
  }
  const text = value.trim();
  if (text.length < min || text.length > max || HTML_TOKEN.test(text)) {
    throw new BadRequestException(`${label} tidak valid.`);
  }
  return text;
}

function boundedInteger(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  ) {
    throw new BadRequestException(`${label} tidak valid.`);
  }
  return value;
}

export function normalizeIndonesianPhone(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException('Nomor kontak tidak valid.');
  }

  const compact = value.trim().replace(/[\s().-]/g, '');
  if (!compact || /[^+\d]/.test(compact) || (compact.match(/\+/g)?.length ?? 0) > 1) {
    throw new BadRequestException('Nomor kontak tidak valid.');
  }

  let digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (digits.startsWith('0')) {
    digits = `62${digits.slice(1)}`;
  } else if (!digits.startsWith('62')) {
    throw new BadRequestException(
      'Nomor kontak harus menggunakan nomor Indonesia dengan kode +62.',
    );
  }

  const normalized = `+${digits}`;
  if (!/^\+628\d{7,12}$/.test(normalized)) {
    throw new BadRequestException(
      'Nomor kontak tidak valid. Gunakan format Indonesia, misalnya +628116904422.',
    );
  }
  return normalized;
}

export function parseLibrarySettingsInput(body: unknown): LibrarySettings {
  const input = objectInput(body);
  const allowed = new Set([
    'libraryName',
    'address',
    'serviceHours',
    'phoneE164',
    'reservationDurationHours',
    'loanDurationDays',
    'extensionDurationDays',
    'maxExtensions',
  ]);
  if (
    Object.keys(input).length !== allowed.size ||
    Object.keys(input).some((key) => !allowed.has(key))
  ) {
    throw new BadRequestException('Field pengaturan tidak lengkap atau tidak dikenal.');
  }

  const maxExtensions =
    input.maxExtensions === null
      ? null
      : boundedInteger(input.maxExtensions, 'Batas maksimal perpanjangan', 0, 100);

  return {
    libraryName: plainText(input.libraryName, 'Nama perpustakaan', 2, 120),
    address: plainText(input.address, 'Alamat perpustakaan', 5, 500),
    serviceHours: plainText(input.serviceHours, 'Jam layanan', 3, 80),
    phoneE164: normalizeIndonesianPhone(input.phoneE164),
    reservationDurationHours: boundedInteger(
      input.reservationDurationHours,
      'Durasi reservasi',
      1,
      168,
    ),
    loanDurationDays: boundedInteger(
      input.loanDurationDays,
      'Durasi pinjam',
      1,
      365,
    ),
    extensionDurationDays: boundedInteger(
      input.extensionDurationDays,
      'Durasi perpanjangan',
      1,
      365,
    ),
    maxExtensions,
  };
}

function parseDateOnly(value: unknown, label: string) {
  if (typeof value !== 'string') {
    throw new BadRequestException(`${label} tidak valid.`);
  }
  const match = DATE_ONLY.exec(value);
  if (!match) {
    throw new BadRequestException(`${label} harus berformat YYYY-MM-DD.`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = new Date(Date.UTC(year, month - 1, day));
  if (
    utc.getUTCFullYear() !== year ||
    utc.getUTCMonth() !== month - 1 ||
    utc.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${label} tidak valid.`);
  }
  return { value, utc };
}

export function parseReportRange(from: unknown, to: unknown) {
  const start = parseDateOnly(from, 'Tanggal awal');
  const finish = parseDateOnly(to, 'Tanggal akhir');
  if (start.utc > finish.utc) {
    throw new BadRequestException('Tanggal awal tidak boleh melewati tanggal akhir.');
  }
  const days = Math.floor((finish.utc.getTime() - start.utc.getTime()) / DAY_MS) + 1;
  if (days > 366) {
    throw new BadRequestException('Rentang laporan maksimal 366 hari.');
  }

  const startInstant = new Date(start.utc.getTime() - JAKARTA_OFFSET_MS);
  const endExclusive = new Date(finish.utc.getTime() + DAY_MS - JAKARTA_OFFSET_MS);
  return {
    from: start.value,
    to: finish.value,
    start: startInstant,
    endExclusive,
    days,
  };
}

export function parseChartGranularity(value: unknown, range: ReturnType<typeof parseReportRange>): ChartGranularity {
  if (value === undefined) return getChartGranularity(range);
  if (typeof value !== 'string' || !['hour', 'day', 'month', 'year'].includes(value)) {
    throw new BadRequestException('Granularitas grafik tidak valid.');
  }
  if (value === 'hour' && range.days !== 1) {
    throw new BadRequestException('Grafik per jam hanya tersedia untuk satu hari.');
  }
  if (value === 'day' && range.days > 62) {
    throw new BadRequestException('Grafik per hari maksimal 62 hari.');
  }
  return value as ChartGranularity;
}

export function parseNotificationQuery(query: {
  search?: unknown;
  channel?: unknown;
  page?: unknown;
  limit?: unknown;
}) {
  const rawSearch = query.search == null ? '' : String(query.search).trim();
  if (rawSearch.length > 120 || HTML_TOKEN.test(rawSearch)) {
    throw new BadRequestException('Pencarian notifikasi tidak valid.');
  }

  const channel = String(query.channel ?? 'ALL').toUpperCase();
  if (!['ALL', 'EMAIL', 'WHATSAPP'].includes(channel)) {
    throw new BadRequestException('Filter kanal notifikasi tidak valid.');
  }

  const page = Number(query.page ?? 1);
  const limit = Number(query.limit ?? 10);
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) {
    throw new BadRequestException('Halaman notifikasi tidak valid.');
  }
  if (![10, 20, 50].includes(limit)) {
    throw new BadRequestException('Jumlah data per halaman tidak valid.');
  }

  return {
    search: rawSearch,
    channel: channel as NotificationChannel,
    page,
    limit,
  };
}
