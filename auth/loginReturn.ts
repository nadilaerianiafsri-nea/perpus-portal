// Only known internal routes can become a login return destination.
export function loginReturn(value: unknown): string {
  if (typeof value !== "string" || value !== value.trim()) return "/dashboard";
  const detail = /^\/(?:dashboard\/)?koleksi\/([1-9]\d*)$/.exec(value);
  if (detail && Number(detail[1]) <= 2147483647)
    return `/dashboard/koleksi/${detail[1]}`;
  return /^\/(?:e-book\/[1-9]\d*\/baca|dashboard(?:\/(?:koleksi|reservasi|pinjaman|riwayat|e-book|notifikasi|profil))?)$/.test(
    value,
  )
    ? value
    : "/dashboard";
}
