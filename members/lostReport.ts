export type LostReport = {
  status: "MENUNGGU_VERIFIKASI" | "PROSES_PENGGANTIAN" | "SELESAI";
  source: "ANGGOTA" | "ADMIN";
  reportedAt: string | null; verifiedAt: string | null; resolvedAt: string | null;
};
type ReportLoan = { status: string; returnedAt?: string | null; book: { type?: string }; lostReport?: LostReport | null };
export function canReportLost(loan: ReportLoan) {
  return loan.status === "AKTIF" && !loan.returnedAt && loan.book.type === "FISIK" && !loan.lostReport;
}
export function canExtendReportedLoan(loan: ReportLoan) {
  return loan.status === "AKTIF" && !loan.returnedAt && loan.book.type !== "EBOOK" && !loan.lostReport;
}
export function lostReportLabel(status: string) {
  return status === "MENUNGGU_VERIFIKASI" ? "Menunggu Verifikasi" : status === "PROSES_PENGGANTIAN" ? "Proses Penggantian" : status === "SELESAI" ? "Selesai" : "Status belum tersedia";
}
