import { textInputError, isSafeUrl } from '../../../shared/inputValidation.cjs';
import { isSafeCoverFilename } from '../admin-uploads/cover-file';

export type AdminBookInput = {
  code: string;
  title: string;
  author: string;
  isbnIssn: string | null;
  publisher: string;
  year: number;
  edition: string | null;
  language: string;
  subject: string;
  location: string;
  shelf: string;
  totalStock: number;
  description: string;
  coverUrl: string;
  isActive: boolean;
};

function record(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new Error('Data buku tidak valid.');
  }
  return body as Record<string, unknown>;
}

function requiredText(
  value: unknown,
  label: string,
  max = 191,
): string {
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
  const error = textInputError(value, { max, required: false, multiline: max > 191 });
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

export function positiveBookId(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error('ID buku tidak valid.');
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) {
    throw new Error('ID buku tidak valid.');
  }
  return id;
}

export function copyCode(bookCode: string, index: number): string {
  return `${bookCode}-E${index}`;
}

function coverUrlInput(value: unknown): string {
  const url = requiredText(value, 'Cover', 191);
  const local = /^\/images\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:svg|jpg|jpeg|png|webp)$/.test(url)
    || (url.startsWith('/uploads/covers/') && isSafeCoverFilename(url.slice('/uploads/covers/'.length)));
  if (!isSafeUrl(url) && !local) throw new Error('URL cover tidak valid.');
  return url;
}

export function parseAdminBookInput(body: unknown): AdminBookInput {
  const input = record(body);
  const allowed = new Set(["code", "title", "author", "isbnIssn", "publisher", "year", "edition", "language", "subject", "description", "coverUrl", "isActive", "location", "shelf", "totalStock"]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new Error('Terdapat field yang tidak diizinkan.');
  }
  const code = requiredText(input.code, 'Kode Buku', 64);
  const title = requiredText(input.title, 'Judul');
  const author = requiredText(input.author, 'Penulis / Pengarang');
  const publisher = requiredText(input.publisher, 'Penerbit');
  const year = integer(input.year, 'Tahun Terbit', 1000, 9999);
  const language = requiredText(input.language, 'Bahasa', 64);
  const subject = requiredText(input.subject, 'Subjek / Kategori');
  const location = requiredText(input.location, 'Lokasi');
  const shelf = requiredText(input.shelf, 'Rak');
  const totalStock = integer(input.totalStock, 'Jumlah Stok', 0, 9999);
  const description = requiredText(input.description, 'Deskripsi', 10000);
  const coverUrl = coverUrlInput(input.coverUrl);
  const isActive = input.isActive;
  if (typeof isActive !== 'boolean') {
    throw new Error('Status katalog tidak valid.');
  }

  return {
    code,
    title,
    author,
    isbnIssn: optionalText(input.isbnIssn, 'ISBN/ISSN', 64),
    publisher,
    year,
    edition: optionalText(input.edition, 'Edisi'),
    language,
    subject,
    location,
    shelf,
    totalStock,
    description,
    coverUrl,
    isActive,
  };
}

export type StockRow = {
  id: number;
  status: 'TERSEDIA' | 'DIRESERVASI' | 'DIPINJAM' | 'HILANG';
};

export function planStockChange(
  rows: StockRow[],
  target: number,
): { deleteIds: number[]; addCount: number } {
  const protectedCount = rows.filter((row) => row.status !== 'TERSEDIA').length;
  if (target < protectedCount) {
    throw new Error(
      'Jumlah stok tidak boleh lebih kecil dari eksemplar yang sedang dipinjam, direservasi, atau hilang.',
    );
  }

  if (target >= rows.length) {
    return { deleteIds: [], addCount: target - rows.length };
  }

  const removeCount = rows.length - target;
  const available = rows
    .filter((row) => row.status === 'TERSEDIA')
    .sort((a, b) => b.id - a.id);

  return {
    deleteIds: available.slice(0, removeCount).map((row) => row.id),
    addCount: 0,
  };
}
