import { containsHtml, textInputError } from '../shared/inputValidation.cjs';

export type AdminGrantStatus = "BELUM_DIKATALOGKAN" | "SUDAH_DIKATALOGKAN";

export type AdminGrantItem = {
  id: number;
  title: string;
  quantity: number;
};

export type AdminGrantListItem = {
  id: number;
  donorName: string;
  receivedAt: string;
  status: AdminGrantStatus;
  note: string | null;
  isDemo: boolean;
  items: AdminGrantItem[];
  totalTitles: number;
  totalBooks: number;
  createdAt: string;
  updatedAt: string;
};

export type AdminGrantsResponse = {
  data: AdminGrantListItem[];
  stats: {
    totalBooks: number;
    pendingBooks: number;
    cataloguedBooks: number;
    totalReceipts: number;
  };
  years: number[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type AdminGrantDetailResponse = {
  grant: AdminGrantListItem;
};

export const adminGrantStatusLabels: Record<AdminGrantStatus, string> = {
  BELUM_DIKATALOGKAN: "Belum Dikatalogkan",
  SUDAH_DIKATALOGKAN: "Sudah Dikatalogkan",
};

export function formatAdminGrantDate(value: string | null) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function grantCode(id: number) {
  return `HIB-${String(id).padStart(5, "0")}`;
}

export async function adminGrantApiMessage(
  response: Response,
  fallback: string,
) {
  try {
    const payload = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(payload.message)) {
      return payload.message.join(", ");
    }

    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Respons bukan JSON.
  }

  return fallback;
}

export function adminGrantTextError(fields: Record<string, unknown>): string | null {
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value !== 'string') continue;
    if (containsHtml(value)) return 'HTML tidak diperbolehkan pada kolom ini.';
    const max = ['description', 'licenseNote'].includes(key) ? 10000 : key === 'note' ? 3000 : ['code', 'isbnIssn', 'language'].includes(key) ? 64 : 191;
    const error = textInputError(value, { max, required: false, multiline: ['description', 'licenseNote', 'note'].includes(key) });
    if (error) return error;
  }
  return null;
}
