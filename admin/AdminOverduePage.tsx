/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import { FiAlertTriangle, FiClock, FiDownload, FiMessageCircle, FiSearch } from 'react-icons/fi';
import AppSelect from '@/components/AppSelect';
import PeriodSelector from '@/components/PeriodSelector';
import { Button, ButtonLink } from '@/components/Button';
import { createTransactionPeriod } from '@/shared/transactionPeriod';
import { jakartaDateInput } from '@/shared/period';
import { safeCoverUrl } from '../shared/displayUrls.cjs';
import type { OverdueBucket } from '../shared/loanOverdue.cjs';
import { plainTextMessage } from '../members/inputSecurity';
import AdminStatCard from './AdminStatCard';
import { formatTransactionDate, memberTypeLabel } from './adminTransactions';
import { loadOverdueLoans, overdueCsv, overdueDetailHref, overdueQuery, overdueWhatsappHref, type OverdueResponse } from './adminOverdue';
import { downloadTransactionCsv } from './transactionCsv';
import styles from './AdminTransactions.module.css';
import tools from './AdminLoanTools.module.css';
import ui from './AdminOverdue.module.css';

type State = { key: string; result: OverdueResponse | null; error: string };
export default function AdminOverduePage() {
  const [searchInput, setSearchInput] = useState(''), [search, setSearch] = useState('');
  const [bucket, setBucket] = useState<OverdueBucket>('ALL'), [memberType, setMemberType] = useState('ALL');
  const [sort, setSort] = useState<'OLDEST' | 'NEWEST'>('OLDEST'), [page, setPage] = useState(1);
  const [period, setPeriod] = useState(() => createTransactionPeriod('all'));
  const [revision, setRevision] = useState(0), [state, setState] = useState<State>({ key: '', result: null, error: '' });
  const searchError = plainTextMessage(searchInput, 100);
  const query = overdueQuery({ search, bucket, memberType, sort, page, period });
  const requestKey = `${query}|${revision}`;
  const loading = state.key !== requestKey || searchInput.trim() !== search || Boolean(searchError);
  const result = state.key === requestKey ? state.result : null;
  const error = state.key === requestKey ? state.error : '';
  useEffect(() => {
    if (searchError || searchInput.trim() === search) return;
    const timeout = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => clearTimeout(timeout);
  }, [searchInput, searchError, search]);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const data = await loadOverdueLoans(new URLSearchParams(requestKey.split('|')[0]), controller.signal);
        if (controller.signal.aborted) return;
        if (data.meta.page !== page) { setPage(data.meta.page); return; }
        setState({ key: requestKey, result: data, error: '' });
      } catch (reason) {
        if (!controller.signal.aborted) setState({ key: requestKey, result: null, error: reason instanceof Error ? reason.message : 'Data belum dapat dimuat.' });
      }
    }
    void load(); return () => controller.abort();
  }, [requestKey, page]);
  const stats = result?.overdueStats;
  const rows = result?.data ?? [];
  const exportingDisabled = loading || Boolean(error) || !rows.length;
  const retry = () => setRevision(value => value + 1);
  return <div className={styles.page}>
    <header className={styles.pageHeading}><h1 data-page-title>Terlambat</h1></header>
    <section className={`${styles.statsFour} ${ui.stats}`} aria-label="Ringkasan pinjaman terlambat">
      <AdminStatCard label="TOTAL TERLAMBAT" value={stats?.total ?? '—'} tone="dark" icon={<FiAlertTriangle />} />
      <AdminStatCard label="TERLAMBAT 1–3 HARI" value={stats?.oneToThree ?? '—'} tone="warning" icon={<FiClock />} />
      <AdminStatCard label="TERLAMBAT 4–14 HARI" value={stats?.fourToFourteen ?? '—'} tone="warning" icon={<FiClock />} />
      <AdminStatCard label="TERLAMBAT >14 HARI" value={stats?.overFourteen ?? '—'} tone="danger" icon={<FiAlertTriangle />} />
    </section>
    <section className={styles.panel} aria-label="Daftar pinjaman terlambat" aria-busy={loading}>
    <header className={styles.panelHeader}><h2>Daftar Pinjaman Terlambat</h2></header>
    <div className={`${tools.tools} ${ui.toolbar}`} role="group" aria-label="Filter pinjaman terlambat">
      <label className={styles.searchBox}><FiSearch aria-hidden="true" /><input type="search" aria-label="Cari pinjaman terlambat" placeholder="Cari anggota, judul, kode buku, atau WhatsApp..." maxLength={100} value={searchInput} aria-invalid={Boolean(searchError)} aria-describedby={searchError ? 'overdue-search-error' : undefined} onChange={event => setSearchInput(event.target.value)} /></label>
      {searchError ? <p id="overdue-search-error" role="alert" className={styles.searchError}>{searchError}</p> : null}
      <div className={tools.filters}>
        <AppSelect aria-label="Tingkat keterlambatan" value={bucket} onChange={event => { setBucket(event.target.value as OverdueBucket); setPage(1); }}><option value="ALL">Semua Tingkat Keterlambatan</option><option value="ONE_TO_THREE">1–3 Hari</option><option value="FOUR_TO_FOURTEEN">4–14 Hari</option><option value="OVER_FOURTEEN">Lebih dari 14 Hari</option></AppSelect>
        <AppSelect aria-label="Jenis anggota" value={memberType} onChange={event => { setMemberType(event.target.value); setPage(1); }}><option value="ALL">Semua Jenis Anggota</option><option value="UMUM">Masyarakat Umum</option><option value="MAHASISWA">Mahasiswa</option><option value="PEGAWAI">Pegawai Internal</option></AppSelect>
        <div className={tools.period}><PeriodSelector mode="transaction" label="Waktu jatuh tempo" value={period} onChange={value => { setPeriod(value); setPage(1); }} /></div>
        <AppSelect aria-label="Urutan keterlambatan" value={sort} onChange={event => { setSort(event.target.value as 'OLDEST' | 'NEWEST'); setPage(1); }}><option value="OLDEST">Terlambat Terlama Dulu</option><option value="NEWEST">Terlambat Terbaru Dulu</option></AppSelect>
      </div>
      <div className={tools.exportControl}><Button variant="primary" accentHover icon={<FiDownload />} disabled={exportingDisabled} onClick={() => { if (!exportingDisabled && result) downloadTransactionCsv(overdueCsv(rows), `pinjaman-terlambat-halaman-${result.meta.page}-${jakartaDateInput()}.csv`); }}>Ekspor CSV</Button></div>
    </div>
      {error ? <div className={ui.state} role="alert"><h2>Data belum dapat ditampilkan</h2><p>{error}</p><Button variant="secondary" onClick={retry}>Coba Lagi</Button></div>
        : loading ? <div className={ui.state} role="status">Memuat pinjaman terlambat...</div>
          : !rows.length ? <div className={ui.state} role="status"><FiClock aria-hidden="true" /><h2>{stats?.total === 0 ? 'Tidak ada pinjaman terlambat.' : 'Tidak ada pinjaman terlambat yang sesuai dengan pencarian atau filter.'}</h2>{stats?.total === 0 ? <p>Semua pinjaman aktif masih berada dalam batas waktu pengembalian.</p> : null}</div>
            : <>
              <div className={styles.tableScroller}><table data-record-list data-record-scroll className={`${styles.table} ${ui.table}`}><thead><tr><th scope="col">ANGGOTA</th><th scope="col">BUKU</th><th scope="col">JATUH TEMPO</th><th scope="col">TERLAMBAT</th><th scope="col">AKSI</th></tr></thead>
                <tbody>{rows.map(row => { const whatsapp = overdueWhatsappHref(row); return <tr key={row.id}>
                  <td><div className={styles.memberCell}><strong>{row.member.name}</strong><small>{memberTypeLabel(row.member.memberType)}</small></div></td>
                  <td><div className={styles.bookCell}><img src={safeCoverUrl(row.book.coverUrl)} alt={`Sampul ${row.book.title}`} width={40} height={56} /><div><strong>{row.book.title}</strong><small>{row.book.code}</small></div></div></td>
                  <td><time dateTime={row.dueAt}>{formatTransactionDate(row.dueAt)}</time></td>
                  <td><span data-record-badge className={`${ui.days} ${row.overdueDays <= 3 ? ui.mild : row.overdueDays <= 14 ? ui.warning : ui.danger}`}>{row.overdueDays} hari</span></td>
                  <td><div className={ui.actions}>{whatsapp ? <a data-button="secondary" href={whatsapp} target="_blank" rel="noopener noreferrer" aria-label={`Kirim WhatsApp kepada ${row.member.name} untuk ${row.book.title}`}><FiMessageCircle aria-hidden="true" />Kirim WhatsApp</a> : <Button variant="secondary" disabled aria-label={`WhatsApp ${row.member.name} tidak tersedia atau tidak valid`} title="Nomor WhatsApp tidak tersedia atau tidak valid" icon={<FiMessageCircle />}>Kirim WhatsApp</Button>}
                    <ButtonLink variant="primary" accentHover href={overdueDetailHref(row.id)} aria-label={`Detail pinjaman ${row.book.title} oleh ${row.member.name}`}>Detail</ButtonLink></div></td>
                </tr>; })}</tbody></table></div>
              <p className={ui.resultCount}>Menampilkan {(result!.meta.page - 1) * result!.meta.limit + 1}–{Math.min(result!.meta.page * result!.meta.limit, result!.meta.total)} dari {result!.meta.total} pinjaman terlambat</p>
            </>}
      {!loading && !error && result && result.meta.totalPages > 1 ? <nav className={`${styles.pagination} ${styles.transactionPagination}`} aria-label="Halaman pinjaman terlambat"><Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Sebelumnya</Button><span>Halaman {result.meta.page} dari {result.meta.totalPages}</span><Button variant="secondary" size="sm" disabled={page >= result.meta.totalPages} onClick={() => setPage(value => value + 1)}>Berikutnya</Button></nav> : null}
    </section>
  </div>;
}
