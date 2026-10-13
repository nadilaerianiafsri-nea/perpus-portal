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

export type NotificationChannel = "ALL" | "EMAIL" | "WHATSAPP";
export type NotificationStatus =
  | "TERKIRIM"
  | "GAGAL"
  | "MENUNGGU"
  | "MENGIRIM"
  | "MANUAL";

export type AdminNotificationRow = {
  id: string;
  sourceNotificationId: number;
  memberName: string;
  memberEmail: string;
  memberWhatsapp: string;
  transactionCode: string;
  reminderType: string;
  bookTitle: string | null;
  channel: "SYSTEM" | "EMAIL" | "WHATSAPP";
  time: string;
  status: NotificationStatus;
};

export type PageMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminNotificationsResponse = {
  counts: {
    all: number;
    email: number;
    whatsapp: number;
    failed: number;
  };
  data: AdminNotificationRow[];
  meta: PageMeta;
};

export type ReportTrendRow = {
  key: string;
  label: string;
  borrowings: number;
  returns: number;
};

export type AdminReportResponse = {
  range: {
    from: string;
    to: string;
  };
  stats: {
    borrowings: number;
    returns: number;
    expiredReservations: number;
    overdue: number;
    popularBook: string;
    popularBookCount: number;
    activeMembers: number;
    grantsReceived: number;
    lostBooks: number;
  };
  trend: ReportTrendRow[];
};

export async function adminOperationsApiMessage(
  response: Response,
  fallback: string,
) {
  try {
    const payload = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(payload.message)) return payload.message.join(", ");
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
  } catch {
    // Respons bukan JSON.
  }
  return fallback;
}

export function formatAdminOperationDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export function formatPhoneDisplay(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits.startsWith("62") || digits.length < 10) return value || "-";
  const local = digits.slice(2);
  const a = local.slice(0, 3);
  const b = local.slice(3, 7);
  const c = local.slice(7);
  return [`+62`, a, b, c].filter(Boolean).join(" ").replace(` ${b} ${c}`, ` ${b}-${c}`);
}

export function normalizePhoneClient(value: string) {
  const compact = value.trim().replace(/[\s().-]/g, "");
  if (!compact) return "";
  let digits = compact.startsWith("+") ? compact.slice(1) : compact;
  if (digits.startsWith("0")) digits = `62${digits.slice(1)}`;
  if (!digits.startsWith("62")) digits = `62${digits}`;
  return `+${digits}`;
}

function csvCell(value: string | number) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function reportCsv(report: AdminReportResponse) {
  const rows: Array<Array<string | number>> = [
    ["Laporan Perpustakaan"],
    ["Dari Tanggal", report.range.from],
    ["Sampai Tanggal", report.range.to],
    [],
    ["Ringkasan", "Nilai"],
    ["Jumlah Peminjaman", report.stats.borrowings],
    ["Pengembalian", report.stats.returns],
    ["Reservasi Kedaluwarsa", report.stats.expiredReservations],
    ["Keterlambatan", report.stats.overdue],
    ["Buku Populer", report.stats.popularBook],
    ["Jumlah Peminjaman Buku Populer", report.stats.popularBookCount],
    ["Anggota Aktif", report.stats.activeMembers],
    ["Hibah Masuk", report.stats.grantsReceived],
    ["Buku Hilang / Penggantian", report.stats.lostBooks],
    [],
    ["Periode", "Peminjaman", "Pengembalian"],
    ...report.trend.map((row) => [row.label, row.borrowings, row.returns]),
  ];
  return `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function jakartaDateInput(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function monthsBeforeDateInput(months: number, date = new Date()) {
  const current = jakartaDateInput(date);
  const [year, month, day] = current.split("-").map(Number);
  const result = new Date(Date.UTC(year, month - 1 - months, Math.min(day, 28)));
  return `${result.getUTCFullYear()}-${String(result.getUTCMonth() + 1).padStart(2, "0")}-${String(result.getUTCDate()).padStart(2, "0")}`;
}
