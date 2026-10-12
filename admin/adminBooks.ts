import { containsHtml, isSafeUrl, textInputError } from '../shared/inputValidation.cjs';

export type AdminBookListItem = {
  id: number;
  code: string;
  title: string;
  author: string;
  year: number;
  coverUrl: string;
  isActive: boolean;
  totalCopies: number;
  availableCopies: number;
  availability: 'TERSEDIA' | 'STOK_HABIS';
};

export type AdminBooksResponse = {
  stats: { total: number; active: number; inactive: number };
  data: AdminBookListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type AdminBookTransaction = {
  id: string;
  code: string;
  type: 'RESERVASI' | 'PEMINJAMAN';
  status: string;
  deadline: string;
  member: { id: number; name: string; email: string };
  copyCode: string;
};

export type AdminBookDetail = {
  id: number;
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
  shelf: string;
  location: string;
  isActive: boolean;
  totalCopies: number;
  availableCopies: number;
  copies: Array<{
    id: number;
    code: string;
    status: 'TERSEDIA' | 'DIRESERVASI' | 'DIPINJAM' | 'HILANG';
    location: string;
  }>;
  transactions: AdminBookTransaction[];
};

export type AdminBookDetailResponse = { book: AdminBookDetail };

export type AdminBookPayload = {
  code: string;
  title: string;
  author: string;
  isbnIssn: string;
  publisher: string;
  year: number;
  edition: string;
  language: string;
  subject: string;
  location: string;
  shelf: string;
  totalStock: number;
  description: string;
  coverUrl: string;
  isActive: boolean;
};

export async function apiMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(', ');
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export function adminDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

export function adminBookTextError(fields: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== 'string') continue;
    if (containsHtml(value)) return 'HTML tidak diperbolehkan pada kolom ini.';
    const max = ['description', 'licenseNote'].includes(key) ? 10000 : key === 'note' ? 3000 : ['code', 'isbnIssn', 'language'].includes(key) ? 64 : 191;
    const error = textInputError(value, { max, required: false, multiline: ['description', 'licenseNote', 'note'].includes(key) });
    if (error) return error;
  }
  return null;
}

export function adminCoverUrl(value: string | null | undefined): string {
  const safe = typeof value === 'string' && (isSafeUrl(value)
    || /^\/images\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:svg|jpg|jpeg|png|webp)$/.test(value)
    || /^\/uploads\/covers\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp)$/.test(value));
  return safe ? value! : '/images/landing/book-placeholder-1.svg';
}
