import { physicalLoanStatus, transactionApiMessage, type TransactionBook, type TransactionMember } from "./adminTransactions";

export type PhysicalLoanDetail = {
  id: number;
  status: "AKTIF" | "DIKEMBALIKAN" | "HILANG";
  borrowedAt: string;
  dueAt: string;
  returnedAt: string | null;
  extensionCount: number;
  member: TransactionMember;
  book: TransactionBook & { shelf: string | null };
  copy: { id: number; code: string; location: string };
};

export type EbookAccessDetail = {
  id: number;
  addedAt: string;
  lastOpenedAt: string | null;
  endsAt: string | null;
  progress: number;
  member: TransactionMember;
  book: TransactionBook & { author: string };
};

export function parseLoanDetailId(value: string): number | null {
  const id = Number(value);
  return /^\d+$/.test(value) && Number.isSafeInteger(id) && id > 0 && id <= 2147483647 ? id : null;
}

export function loanDetailBackHref(source?: string | string[]) {
  return source === 'terlambat' ? '/admin/transaksi/terlambat' : '/admin/transaksi/peminjaman';
}

type DetailRecord = PhysicalLoanDetail | EbookAccessDetail;
type JsonObject = Record<string, unknown>;
const isObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null;
const isDate = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value));
const nullableDate = (value: unknown) => value === null || isDate(value);

function validDetail(value: unknown, id: number, kind: "loan" | "access"): value is DetailRecord {
  if (!isObject(value) || value.id !== id || !isObject(value.member) || !isObject(value.book)) return false;
  const { member, book } = value;
  if (!["name", "email", "whatsapp"].every(key => typeof member[key] === "string")) return false;
  if (!["code", "title", "coverUrl"].every(key => typeof book[key] === "string")) return false;
  if (kind === "loan") {
    return ["AKTIF", "DIKEMBALIKAN", "HILANG"].includes(String(value.status))
      && isDate(value.borrowedAt) && isDate(value.dueAt) && nullableDate(value.returnedAt)
      && typeof value.extensionCount === "number" && Number.isInteger(value.extensionCount) && value.extensionCount >= 0
      && isObject(value.copy) && typeof value.copy.code === "string" && typeof value.copy.location === "string"
      && (value.book.shelf === null || typeof value.book.shelf === "string");
  }
  return isDate(value.addedAt) && nullableDate(value.lastOpenedAt) && nullableDate(value.endsAt)
    && typeof value.progress === "number" && Number.isFinite(value.progress) && typeof value.book.author === "string";
}

async function loadDetail(id: number, kind: "loan" | "access", signal: AbortSignal, request: typeof fetch) {
  if (parseLoanDetailId(String(id)) === null) throw new Error("ID detail tidak valid.");
  signal.throwIfAborted();
  const resource = kind === "loan" ? "loans" : "ebook-access";
  const fallback = kind === "loan" ? "Detail peminjaman belum dapat dimuat." : "Detail akses e-book belum dapat dimuat.";
  const response = await request(`/api/members/admin/transactions/${resource}/${id}`, { cache: "no-store", signal });
  signal.throwIfAborted();
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(await transactionApiMessage(response, fallback));
  const payload: unknown = await response.json();
  signal.throwIfAborted();
  const record = isObject(payload) ? payload[kind] : null;
  if (!validDetail(record, id, kind)) throw new Error(fallback);
  return record;
}

export async function loadPhysicalLoan(id: number, signal: AbortSignal, request: typeof fetch = fetch): Promise<PhysicalLoanDetail | null> {
  return await loadDetail(id, "loan", signal, request) as PhysicalLoanDetail | null;
}

export async function loadEbookAccess(id: number, signal: AbortSignal, request: typeof fetch = fetch): Promise<EbookAccessDetail | null> {
  return await loadDetail(id, "access", signal, request) as EbookAccessDetail | null;
}

type DetailStatus = { label: string; tone: "success" | "warning" | "danger" | "neutral" };

export function loanDetailStatus(loan: PhysicalLoanDetail): DetailStatus {
  if (loan.status === "DIKEMBALIKAN") return { label: "Dikembalikan", tone: "success" };
  if (loan.status === "HILANG") return { label: "Hilang", tone: "danger" };
  const status = physicalLoanStatus(loan.dueAt);
  if (status === "TERLAMBAT") return { label: "Terlambat", tone: "danger" };
  if (status === "JATUH_TEMPO") return { label: "Jatuh Tempo", tone: "warning" };
  return { label: "Aktif", tone: "success" };
}

export function ebookDetailStatus(endsAt: string | null, now = Date.now()): DetailStatus {
  return endsAt !== null && Date.parse(endsAt) <= now
    ? { label: "Berakhir", tone: "neutral" }
    : { label: "Aktif", tone: "success" };
}
