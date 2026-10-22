import { csvCell } from "./adminOperations";
import {
  formatTransactionDateTime,
  memberTypeLabel,
  transactionApiMessage,
  transactionId,
  type ReservationRow,
  type ReservationsResponse,
} from "./adminTransactions";

export type ReservationSort = "newest" | "oldest";

export function sortReservations(rows: ReservationRow[], order: ReservationSort) {
  return [...rows].sort((a, b) => {
    const left = Date.parse(a.createdAt), right = Date.parse(b.createdAt);
    if (!Number.isFinite(left)) return Number.isFinite(right) ? 1 : a.id - b.id;
    if (!Number.isFinite(right)) return -1;
    const comparison = left - right || a.id - b.id;
    return order === "oldest" ? comparison : -comparison;
  });
}

export function reservationStatusLabel(status: string) {
  switch (status) {
    case "MENUNGGU_PENGAMBILAN": return "Menunggu Pengambilan";
    case "KEDALUWARSA": return "Kedaluwarsa";
    case "DIBATALKAN": return "Dibatalkan";
    case "DIAMBIL": return "Sudah Diambil";
    default: return "Semua Status";
  }
}

export function reservationsCsv(rows: ReservationRow[]) {
  const cells: Array<Array<string | number>> = [
    ["Kode Reservasi", "Anggota", "Jenis Anggota", "Email", "WhatsApp", "Judul Buku", "Kode Buku", "Kode Eksemplar", "Tanggal Reservasi (WIB)", "Batas Pengambilan (WIB)", "Status"],
    ...rows.map(row => [
      transactionId(row.id), row.member.name, memberTypeLabel(row.member.memberType),
      row.member.email, row.member.whatsapp, row.book.title, row.book.code, row.copy.code,
      formatTransactionDateTime(row.createdAt), formatTransactionDateTime(row.expiresAt),
      reservationStatusLabel(row.status),
    ]),
  ];
  // Reuse the report encoder, including its quote escaping. Also guard formulas
  // preceded by whitespace when these user-provided fields enter a spreadsheet.
  const encode = (value: string | number) => {
    const text = String(value ?? "");
    return csvCell(/^[\s]*[=+\-@]|^[\t\r\n]/.test(text) ? `'${text}` : text);
  };
  return `\uFEFF${cells.map(row => row.map(encode).join(",")).join("\r\n")}`;
}

/** Resolve a live record using only existing, authorized GET endpoints. */
export async function loadReservation(
  id: number,
  memberId: number | null,
  signal: AbortSignal,
  request: typeof fetch = fetch,
): Promise<ReservationRow | null> {
  if (!Number.isSafeInteger(id) || id < 1 || (memberId !== null && (!Number.isSafeInteger(memberId) || memberId < 1))) {
    throw new Error("ID reservasi atau anggota tidak valid.");
  }
  const options = { cache: "no-store" as const, signal };
  const query = new URLSearchParams({ status: "ALL", memberType: "ALL", limit: "100" });
  if (memberId !== null) {
    const response = await request(`/api/members/admin/members/${memberId}`, options);
    if (!response.ok) throw new Error(await transactionApiMessage(response, "Data anggota reservasi belum dapat dimuat."));
    const payload = await response.json();
    if (typeof payload?.member?.email !== "string" || !payload.member.email) throw new Error("Data anggota reservasi belum dapat dimuat.");
    query.set("search", payload.member.email.slice(0, 100));
  }
  for (let page = 1; ; page++) {
    signal.throwIfAborted();
    query.set("page", String(page));
    const response = await request(`/api/members/admin/transactions/reservations?${query}`, options);
    if (!response.ok) throw new Error(await transactionApiMessage(response, "Detail reservasi belum dapat dimuat."));
    const payload = await response.json() as ReservationsResponse;
    const row = payload.data.find(item => item.id === id);
    if (row) return row;
    if (payload.meta.page < page || page >= payload.meta.totalPages) return null;
  }
}
