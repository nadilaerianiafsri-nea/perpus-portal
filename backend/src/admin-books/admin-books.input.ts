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

export function positiveBookId(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error('ID buku tidak valid.');
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw new Error('ID buku tidak valid.');
  }
  return id;
}

export function copyCode(bookCode: string, index: number): string {
  return `${bookCode}-E${index}`;
}

export function parseAdminBookInput(body: unknown): AdminBookInput {
  const input = record(body);
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
  const coverUrl = requiredText(input.coverUrl, 'Cover', 191);
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
