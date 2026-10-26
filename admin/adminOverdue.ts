import { formatTransactionDate, memberTypeLabel, transactionApiMessage, whatsappReminderHref, type LoanRow, type PageMeta } from './adminTransactions';
import { transactionCsv } from './transactionCsv';
import type { TransactionPeriodValue } from '@/shared/transactionPeriod';
import type { OverdueBucket } from '../shared/loanOverdue.cjs';

export type OverdueLoan = LoanRow & { overdueDays: number };
export type OverdueResponse = { data: OverdueLoan[]; overdueStats: { total: number; oneToThree: number; fourToFourteen: number; overFourteen: number }; meta: PageMeta };
export type OverdueFilters = { search: string; bucket: OverdueBucket; memberType: string; sort: 'OLDEST' | 'NEWEST'; page: number; period: TransactionPeriodValue };
export function overdueQuery(filters: OverdueFilters) {
  const query = new URLSearchParams({ status: 'OVERDUE', search: filters.search, bucket: filters.bucket, memberType: filters.memberType, sort: filters.sort, page: String(filters.page), limit: '20' });
  if (!filters.search) query.delete('search');
  if (filters.period.preset !== 'all') { query.set('from', filters.period.from); query.set('to', filters.period.to); }
  return query;
}
export function overdueWhatsappHref(row: OverdueLoan) {
  // Same accepted mobile format as the existing member-profile validation;
  // normalization and reminder copy remain owned by whatsappReminderHref.
  if (row.status !== 'AKTIF' || row.overdueDays < 1 || !/^(?:\+?62|0)8\d{7,12}$/.test(row.member.whatsapp.replace(/[\s-]/g, ''))) return '';
  return whatsappReminderHref(row.member, row.book, row.dueAt);
}
export function overdueDetailHref(id: number) { return `/admin/transaksi/peminjaman/${id}?source=terlambat`; }
export function overdueCsv(rows: OverdueLoan[]) {
  return transactionCsv([['Nama Anggota', 'Jenis Anggota', 'WhatsApp', 'Judul Buku', 'Kode Buku', 'Tanggal Dipinjam', 'Jatuh Tempo', 'Hari Terlambat', 'Jumlah Perpanjangan'],
    ...rows.map(row => [row.member.name, memberTypeLabel(row.member.memberType), row.member.whatsapp, row.book.title, row.book.code, formatTransactionDate(row.borrowedAt), formatTransactionDate(row.dueAt), row.overdueDays, row.extensionCount])]);
}
export async function loadOverdueLoans(query: URLSearchParams, signal: AbortSignal): Promise<OverdueResponse> {
  const response = await fetch(`/api/members/admin/transactions/loans?${query}`, { cache: 'no-store', signal });
  if (!response.ok) throw new Error(await transactionApiMessage(response, 'Data pinjaman terlambat belum dapat dimuat.'));
  const payload = await response.json() as OverdueResponse;
  if (!payload || !Array.isArray(payload.data) || !payload.overdueStats || !payload.meta
    || Object.values(payload.overdueStats).some(value => !Number.isSafeInteger(value) || value < 0)
    || payload.data.some(row => row.status !== 'AKTIF' || !Number.isSafeInteger(row.overdueDays) || row.overdueDays < 1)) throw new Error('Data pinjaman terlambat belum dapat dimuat.');
  return payload;
}
