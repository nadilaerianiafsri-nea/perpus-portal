import { memberTypeLabel, transactionApiMessage, type MemberType } from "./adminTransactions";
import { transactionCsv } from "./transactionCsv";
import { inTransactionPeriod, type TransactionPeriodValue } from "../shared/transactionPeriod";
import { parseLoanDetailId } from "./adminLoanDetails";

export type CirculationSection = "ACTIVE" | "QUEUE" | "HISTORY";
export type CirculationPerson = { id: number; name: string; email: string; memberType: MemberType | null };
export type CirculationBook = { id: number; title: string; code: string; coverUrl: string; author?: string; licenseNote?: string | null };
export type CirculationLoan = {
  id: number; status: "AKTIF" | "DIKEMBALIKAN" | "KEDALUWARSA";
  borrowedAt: string; dueAt: string; endedAt: string | null;
  user: CirculationPerson; book: CirculationBook;
};
export type CirculationQueue = {
  id: number; status: "MENUNGGU" | "DITAWARKAN" | "DIKLAIM" | "DIBATALKAN" | "KEDALUWARSA";
  queuedAt: string; offeredAt: string | null; claimExpiresAt: string | null; position: number | null;
  claimedAt?: string | null; cancelledAt?: string | null; expiredAt?: string | null;
  user: CirculationPerson; book: CirculationBook;
};
export type CirculationRow = CirculationLoan | CirculationQueue;
type Meta = { page: number; limit: number; total: number; totalPages: number };
export type CirculationPayload = {
  activeLoans: { data: CirculationLoan[]; meta: Meta };
  queues: { data: CirculationQueue[]; meta: Meta };
  history: { data: CirculationLoan[]; meta: Meta };
};
export type CirculationDetail = { kind: "loan"; record: CirculationLoan } | { kind: "queue"; record: CirculationQueue };

export function circulationDetailHref(section: CirculationSection, id: number) {
  return `/admin/transaksi/e-book/${id}?jenis=${section === "QUEUE" ? "antrean" : "akses"}`;
}

export function circulationStatusLabel(status: string, kind: CirculationDetail["kind"] = "loan") {
  if (kind === "queue" && status === "KEDALUWARSA") return "Antrean Berakhir";
  const labels: Record<string, string> = {
    AKTIF: "Aktif", DIKEMBALIKAN: "Akses Selesai", KEDALUWARSA: "Berakhir Otomatis",
    MENUNGGU: "Menunggu", DITAWARKAN: "Prioritas 24 Jam", DIKLAIM: "Akses Diaktifkan", DIBATALKAN: "Dibatalkan",
  };
  return Object.hasOwn(labels, status) ? labels[status] : "Status tidak dikenal";
}

export function circulationDateTime(value: string | null | undefined) {
  if (!value || !Number.isFinite(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "medium", timeStyle: "short" }).format(new Date(value)).replace(".", ":") + " WIB";
}

export function filterCirculationRows<T extends CirculationRow>(section: CirculationSection, rows: readonly T[], period: TransactionPeriodValue): T[] {
  return rows.filter(row => {
    const timestamp = section === "QUEUE" ? ("queuedAt" in row ? row.queuedAt : null)
      : section === "HISTORY" ? ("endedAt" in row ? row.endedAt : null)
        : ("borrowedAt" in row ? row.borrowedAt : null);
    return inTransactionPeriod(timestamp, period);
  });
}

/** Export the already filtered current page; encoding is shared with other transactions. */
export function circulationCsv(section: CirculationSection, rows: readonly CirculationRow[]) {
  const columns = ["Nama Anggota", "Jenis Anggota", "Judul E-Book", "Kode E-Book"];
  const headers = section === "QUEUE" ? ["Posisi Antrean", "Masuk Antrean", "Status"]
    : section === "HISTORY" ? ["Mulai Akses", "Batas Akses", "Selesai", "Status Akhir"]
      : ["Mulai Akses", "Batas Akses", "Status"];
  return transactionCsv([[...columns, ...headers], ...rows.map(row => {
    const common = [row.user.name, memberTypeLabel(row.user.memberType), row.book.title, row.book.code];
    if (section === "QUEUE" && "queuedAt" in row) {
      return [...common, row.position ?? "", circulationDateTime(row.queuedAt), circulationStatusLabel(row.status, "queue")];
    }
    if (section !== "QUEUE" && "borrowedAt" in row) {
      return [...common, circulationDateTime(row.borrowedAt), circulationDateTime(row.dueAt),
        ...(section === "HISTORY" ? [circulationDateTime(row.endedAt)] : []), circulationStatusLabel(row.status)];
    }
    throw new Error("Jenis record sirkulasi tidak sesuai tab.");
  })]);
}

type Json = Record<string, unknown>;
const object = (value: unknown): value is Json => typeof value === "object" && value !== null;
const date = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const nullableDate = (value: unknown) => value === null || date(value);
function validDetail(payload: unknown, kind: CirculationDetail["kind"], id: number): payload is CirculationDetail {
  if (!object(payload) || payload.kind !== kind || !object(payload.record)) return false;
  const row = payload.record;
  if (row.id !== id || !object(row.user) || !object(row.book)) return false;
  const { user, book } = row;
  if (!["name", "email"].every(key => typeof user[key] === "string")) return false;
  if (!["title", "code", "coverUrl"].every(key => typeof book[key] === "string")) return false;
  if (kind === "loan") return ["AKTIF", "DIKEMBALIKAN", "KEDALUWARSA"].includes(String(row.status))
    && date(row.borrowedAt) && date(row.dueAt) && nullableDate(row.endedAt);
  return ["MENUNGGU", "DITAWARKAN", "DIKLAIM", "DIBATALKAN", "KEDALUWARSA"].includes(String(row.status))
    && date(row.queuedAt) && nullableDate(row.offeredAt) && nullableDate(row.claimExpiresAt)
    && (row.position === null || (Number.isSafeInteger(row.position) && Number(row.position) > 0));
}

export async function loadCirculationDetail(kind: CirculationDetail["kind"], id: number, signal: AbortSignal, request: typeof fetch = fetch): Promise<CirculationDetail | null> {
  if (parseLoanDetailId(String(id)) === null || !["loan", "queue"].includes(kind)) throw new Error("ID detail tidak valid.");
  signal.throwIfAborted();
  const response = await request(`/api/admin/ebooks/circulation/${kind === "loan" ? "loans" : "queues"}/${id}`, { cache: "no-store", signal });
  signal.throwIfAborted();
  if (response.status === 404) return null;
  const fallback = "Detail sirkulasi E-Book belum dapat dimuat.";
  if (!response.ok) throw new Error(await transactionApiMessage(response, fallback));
  const payload: unknown = await response.json();
  signal.throwIfAborted();
  if (!validDetail(payload, kind, id)) throw new Error(fallback);
  return payload;
}
