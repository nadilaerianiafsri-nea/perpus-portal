export type EBookAccessMode =
  | 'BACA_DI_WEBSITE'
  | 'PENYEDIA_EKSTERNAL'
  | 'TIDAK_TERSEDIA';

export type AdminEBookInput = {
  code: string;
  title: string;
  author: string;
  isbnIssn: string | null;
  publisher: string;
  year: number;
  edition: string | null;
  language: string;
  subject: string;
  description: string;
  coverUrl: string;
  accessMode: EBookAccessMode;
  ebookUrl: string | null;
  accessDurationDays: number | null;
  licenseNote: string | null;
  isActive: boolean;
};

function record(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Data E-Book tidak valid.');
  }
  return body as Record<string, unknown>;
}

function requiredText(value: unknown, label: string, max = 191): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} wajib diisi.`);
  }
  const result = value.trim();
  if (result.length > max) throw new Error(`${label} terlalu panjang.`);
  return result;
}

function optionalText(
  value: unknown,
  label: string,
  max = 191,
): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${label} tidak valid.`);
  const result = value.trim();
  if (!result) return null;
  if (result.length > max) throw new Error(`${label} terlalu panjang.`);
  return result;
}

function integer(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number {
  const result =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && /^-?\d+$/.test(value.trim())
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(result) || result < min || result > max) {
    throw new Error(`${label} tidak valid.`);
  }
  return result;
}

function optionalInteger(
  value: unknown,
  label: string,
  min: number,
  max: number,
): number | null {
  if (value === undefined || value === null || value === '') return null;
  return integer(value, label, min, max);
}

export function positiveEBookId(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error('ID E-Book tidak valid.');
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    throw new Error('ID E-Book tidak valid.');
  }
  return id;
}

export function parseAdminEBookInput(body: unknown): AdminEBookInput {
  const input = record(body);
  const accessMode = input.accessMode;

  if (
    accessMode !== 'BACA_DI_WEBSITE' &&
    accessMode !== 'PENYEDIA_EKSTERNAL' &&
    accessMode !== 'TIDAK_TERSEDIA'
  ) {
    throw new Error('Mode Akses tidak valid.');
  }

  const ebookUrl = optionalText(input.ebookUrl, 'URL / Sumber E-Book', 191);
  if (accessMode !== 'TIDAK_TERSEDIA' && !ebookUrl) {
    throw new Error('URL / Sumber E-Book wajib diisi untuk mode akses ini.');
  }

  const isActive = input.isActive;
  if (typeof isActive !== 'boolean') {
    throw new Error('Status katalog tidak valid.');
  }

  return {
    code: requiredText(input.code, 'Kode E-Book', 64),
    title: requiredText(input.title, 'Judul'),
    author: requiredText(input.author, 'Penulis / Pengarang'),
    isbnIssn: optionalText(input.isbnIssn, 'ISBN/ISSN', 64),
    publisher: requiredText(input.publisher, 'Penerbit'),
    year: integer(input.year, 'Tahun Terbit', 1000, 9999),
    edition: optionalText(input.edition, 'Edisi'),
    language: requiredText(input.language, 'Bahasa', 64),
    subject: requiredText(input.subject, 'Subjek / Kategori'),
    description: requiredText(input.description, 'Deskripsi', 10000),
    coverUrl: requiredText(input.coverUrl, 'Cover', 191),
    accessMode,
    ebookUrl,
    accessDurationDays: optionalInteger(
      input.accessDurationDays,
      'Durasi Akses',
      1,
      36500,
    ),
    licenseNote: optionalText(input.licenseNote, 'Catatan Lisensi', 10000),
    isActive,
  };
}
