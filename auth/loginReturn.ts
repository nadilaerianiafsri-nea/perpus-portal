// Only known member/public book routes can become a login return destination.
export function loginReturn(value: unknown): string {
  if (typeof value !== "string") return "/dashboard";
  return /^\/(?:koleksi\/\d+|e-book\/\d+\/baca|dashboard(?:\/(?:reservasi|pinjaman|riwayat|e-book|notifikasi|profil))?)$/.test(value)
    ? value : "/dashboard";
}
