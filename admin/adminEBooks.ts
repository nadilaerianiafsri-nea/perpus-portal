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
