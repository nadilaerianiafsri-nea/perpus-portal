export type PeriodPreset = "today" | "this-week" | "this-month" | "custom";
export type PeriodValue = { preset: PeriodPreset; from: string; to: string };

/** Existing application date-only convention, independent of the browser timezone. */
export function jakartaDateInput(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Jakarta",
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function createPeriod(preset: Exclude<PeriodPreset, "custom">, now = new Date()): PeriodValue {
  const to = jakartaDateInput(now);
  // UTC arithmetic is only used on the already resolved WIB calendar date.
  const start = new Date(`${to}T00:00:00Z`);
  if (preset === "this-month") start.setUTCDate(1);
  if (preset === "this-week") start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  return { preset, from: start.toISOString().slice(0, 10), to };
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function validatePeriodRange(from: string, to: string, { maxDate, maxDays = 366 }: { maxDate?: string; maxDays?: number } = {}) {
  if (!from || !to) return "Dari Tanggal dan Sampai Tanggal wajib diisi.";
  const start = validDate(from), finish = validDate(to);
  if (!start || !finish) return "Tanggal yang dipilih tidak valid.";
  if (from > to) return "Tanggal mulai tidak boleh melebihi tanggal akhir.";
  if (maxDate && (from > maxDate || to > maxDate)) return "Tanggal tidak boleh melebihi hari ini.";
  if ((finish.getTime() - start.getTime()) / 86_400_000 + 1 > maxDays) return `Rentang tanggal maksimal ${maxDays} hari.`;
  return "";
}

export function formatPeriodRange({ from, to }: Pick<PeriodValue, "from" | "to">) {
  const start = validDate(from), finish = validDate(to);
  if (!start || !finish) return "";
  const format = (date: Date, year: boolean) => new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", ...(year ? { year: "numeric" } : {}), timeZone: "UTC",
  }).format(date);
  if (from === to) return format(finish, true);
  if (from.slice(0, 7) === to.slice(0, 7)) return `${start.getUTCDate()}–${format(finish, true)}`;
  return `${format(start, start.getUTCFullYear() !== finish.getUTCFullYear())}–${format(finish, true)}`;
}
