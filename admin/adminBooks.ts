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
