import type { Loan } from "./types";

export function memberDate(value: string | null, withTime = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", year: "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } as const : {}) }).format(new Date(value));
}

export function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] ?? "").join("").toUpperCase();
}

export function loanState(loan: Loan, now = Date.now()): { label: string; tone: "green" | "orange" | "red" | "neutral"; remaining: string } {
  if (loan.status === "HILANG") return { label: "Hilang", tone: "red", remaining: "Hubungi petugas perpustakaan" };
  if (loan.status === "DIKEMBALIKAN") return { label: "Dikembalikan", tone: "green", remaining: "Peminjaman selesai" };
  const due = new Date(loan.dueAt).getTime();
  const calendarDate = (time: number) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(time));
  if (due < now) return { label: "Terlambat", tone: "red", remaining: `Terlambat ${Math.max(1, Math.ceil((now - due) / 86400000))} hari` };
  if (calendarDate(due) === calendarDate(now)) return { label: "Jatuh Tempo Hari Ini", tone: "orange", remaining: "Kembalikan hari ini" };
  if (calendarDate(due) === calendarDate(now + 86400000)) return { label: "Jatuh Tempo Besok", tone: "orange", remaining: "Sisa 1 hari" };
  const days = Math.ceil((due - now) / 86400000);
  return { label: "Aktif", tone: "green", remaining: `Sisa ${days} hari` };
}
