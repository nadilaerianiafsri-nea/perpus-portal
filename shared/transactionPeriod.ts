import { formatPeriodRange, jakartaDateInput, validatePeriodRange } from "./period";

export type TransactionPeriodPreset = "all" | "today" | "last-seven-days" | "this-month" | "last-month" | "custom";
export type TransactionPeriodValue = { preset: TransactionPeriodPreset; from: string; to: string };

export function createTransactionPeriod(preset: Exclude<TransactionPeriodPreset, "custom">, now = new Date()): TransactionPeriodValue {
  if (preset === "all") return { preset, from: "", to: "" };
  let to = jakartaDateInput(now);
  // Resolve the WIB calendar date first, then use UTC only for calendar arithmetic.
  const start = new Date(`${to}T00:00:00Z`);
  if (preset === "last-seven-days") start.setUTCDate(start.getUTCDate() - 6);
  if (preset === "this-month") start.setUTCDate(1);
  if (preset === "last-month") {
    start.setUTCDate(0);
    to = start.toISOString().slice(0, 10);
    start.setUTCDate(1);
  }
  return { preset, from: start.toISOString().slice(0, 10), to };
}

export function inTransactionPeriod(timestamp: string | null | undefined, period: TransactionPeriodValue): boolean {
  if (period.preset === "all") return true;
  if (!timestamp || validatePeriodRange(period.from, period.to, { maxDays: Infinity })) return false;
  const date = new Date(timestamp);
  if (!Number.isFinite(date.getTime())) return false;
  const day = jakartaDateInput(date);
  return day >= period.from && day <= period.to;
}

export function transactionPeriodLabel(period: TransactionPeriodValue): string {
  if (period.preset === "custom") return formatPeriodRange(period) || "Rentang Tanggal";
  const labels: Record<Exclude<TransactionPeriodPreset, "custom">, string> = {
    all: "Semua Waktu",
    today: "Hari Ini",
    "last-seven-days": "7 Hari Terakhir",
    "this-month": "Bulan Ini",
    "last-month": "Bulan Lalu",
  };
  return labels[period.preset];
}
