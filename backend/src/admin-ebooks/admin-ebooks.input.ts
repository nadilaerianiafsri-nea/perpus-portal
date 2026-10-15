import { textInputError, isSafeUrl } from '../../../shared/inputValidation.cjs';
import { isSafeCoverFilename } from '../admin-uploads/cover-file';
import { privateEBookFilename } from '../admin-uploads/ebook-file';

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
  const error = textInputError(value, { max, multiline: max > 191 });
  if (error) throw new Error(error);
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
  const error = textInputError(value, {
    max,
    required: false,
    multiline: max > 191,
  });
  if (error) throw new Error(error);
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
  const result = typeof value === 'number' ? value : Number.NaN;
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

function coverUrlInput(value: unknown): string {
  const url = requiredText(value, 'Cover', 191);
  const local =
    /^\/images\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:svg|jpg|jpeg|png|webp)$/.test(
      url,
    ) ||
    (url.startsWith('/uploads/covers/') &&
      isSafeCoverFilename(url.slice('/uploads/covers/'.length)));
  if (!isSafeUrl(url) && !local) throw new Error('URL cover tidak valid.');
  return url;
}

function eBookSourceInput(
  value: unknown,
  accessMode: EBookAccessMode,
): string | null {
  if (accessMode === 'TIDAK_TERSEDIA') return null;

  const ebookUrl = optionalText(value, 'URL / Sumber E-Book', 191);

  if (accessMode === 'BACA_DI_WEBSITE') {
    if (!ebookUrl) {
      throw new Error('File E-Book PDF wajib diunggah untuk mode Baca di Website.');
    }

    const legacyLocal = /^\/ebooks\/[A-Za-z0-9_-]+\.(?:html|pdf)$/.test(
      ebookUrl,
    );
    if (!privateEBookFilename(ebookUrl) && !legacyLocal) {
      throw new Error('Sumber E-Book untuk mode Baca di Website tidak valid.');
    }
    return ebookUrl;
  }

  if (!ebookUrl) {
    throw new Error('URL Penyedia E-Book wajib diisi.');
  }
  if (!isSafeUrl(ebookUrl)) {
    throw new Error('URL Penyedia E-Book tidak valid.');
  }
  return ebookUrl;
}

export function parseAdminEBookInput(body: unknown): AdminEBookInput {
  const input = record(body);
  const allowed = new Set([
    'code',
    'title',
    'author',
    'isbnIssn',
    'publisher',
    'year',
    'edition',
    'language',
    'subject',
    'description',
    'coverUrl',
    'isActive',
    'accessMode',
    'ebookUrl',
    'accessDurationDays',
    'licenseNote',
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new Error('Terdapat field yang tidak diizinkan.');
  }

  const accessMode = input.accessMode;
  if (
    accessMode !== 'BACA_DI_WEBSITE' &&
    accessMode !== 'PENYEDIA_EKSTERNAL' &&
    accessMode !== 'TIDAK_TERSEDIA'
  ) {
    throw new Error('Mode Akses tidak valid.');
  }

  const ebookUrl = eBookSourceInput(input.ebookUrl, accessMode);

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
    coverUrl: coverUrlInput(input.coverUrl),
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
