import { containsHtml, isSafeUrl, textInputError } from '../shared/inputValidation.cjs';

export type EBookAccessMode =
  | 'BACA_DI_WEBSITE'
  | 'PENYEDIA_EKSTERNAL'
  | 'TIDAK_TERSEDIA';

export type AdminEBookListItem = {
  id: number;
  code: string;
  title: string;
  author: string;
  publisher: string;
  year: number;
  coverUrl: string;
  accessMode: EBookAccessMode;
  isActive: boolean;
};

export type AdminEBooksResponse = {
  stats: { total: number; active: number; inactive: number };
  data: AdminEBookListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type AdminEBookDetail = {
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
  accessMode: EBookAccessMode;
  ebookUrl: string | null;
  accessDurationDays: number | null;
  licenseNote: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminEBookDetailResponse = { book: AdminEBookDetail };

export type AdminEBookPayload = {
  code: string;
  title: string;
  author: string;
  isbnIssn: string;
  publisher: string;
  year: number;
  edition: string;
  language: string;
  subject: string;
  description: string;
  coverUrl: string;
  accessMode: EBookAccessMode;
  ebookUrl: string;
  accessDurationDays: number | null;
  licenseNote: string;
  isActive: boolean;
};

export async function ebookApiMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(', ');
    return typeof data.message === 'string' ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export function accessModeLabel(mode: EBookAccessMode) {
  if (mode === 'BACA_DI_WEBSITE') return 'Baca di Website';
  if (mode === 'PENYEDIA_EKSTERNAL') return 'Penyedia Eksternal';
  return 'Tidak Tersedia';
}

export function adminEBookTextError(fields: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== 'string') continue;
    if (containsHtml(value)) return 'HTML tidak diperbolehkan pada kolom ini.';
    const max = ['description', 'licenseNote'].includes(key)
      ? 10000
      : key === 'note'
        ? 3000
        : ['code', 'isbnIssn', 'language'].includes(key)
          ? 64
          : 191;
    const error = textInputError(value, {
      max,
      required: false,
      multiline: ['description', 'licenseNote', 'note'].includes(key),
    });
    if (error) return error;
  }
  return null;
}

export function adminEBookSourceUrl(
  value: string | null | undefined,
): string | null {
  const local =
    typeof value === 'string' &&
    (/^\/ebooks\/[A-Za-z0-9_-]+\.(?:html|pdf)$/.test(value) ||
      /^\/private-ebooks\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/.test(
        value,
      ));
  return typeof value === 'string' && (isSafeUrl(value) || local) ? value : null;
}
