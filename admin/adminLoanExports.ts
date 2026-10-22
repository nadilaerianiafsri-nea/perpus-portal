import { transactionCsv } from "./transactionCsv";
import { formatTransactionDate, memberTypeLabel, physicalLoanStatus, type LoanRow, type EbookAccessRow } from "./adminTransactions";

export function physicalLoansCsv(rows: LoanRow[]) {
  return transactionCsv([
    ["Nama Anggota", "Jenis Anggota", "Judul Buku", "Kode Buku", "Tanggal Dipinjam (WIB)", "Jatuh Tempo (WIB)", "Status", "Jumlah Perpanjangan"],
    ...rows.map(row => {
      const status = physicalLoanStatus(row.dueAt);
      return [row.member.name, memberTypeLabel(row.member.memberType), row.book.title, row.book.code,
        formatTransactionDate(row.borrowedAt), formatTransactionDate(row.dueAt),
        status === "TERLAMBAT" ? "Terlambat" : status === "JATUH_TEMPO" ? "Jatuh Tempo ≤ 1 Hari" : "Pinjaman Aktif", row.extensionCount];
    }),
  ]);
}

export function ebookAccessCsv(rows: EbookAccessRow[]) {
  return transactionCsv([
    ["Nama Anggota", "Jenis Anggota", "Judul E-Book", "Kode", "Mulai Akses (WIB)", "Berakhir (WIB)"],
    ...rows.map(row => [row.member.name, memberTypeLabel(row.member.memberType), row.book.title, row.book.code,
      formatTransactionDate(row.addedAt), row.endsAt ? formatTransactionDate(row.endsAt) : "Tanpa Batas"]),
  ]);
}
