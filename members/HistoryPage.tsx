"use client";

import Link from "next/link";
import { FiCheckCircle, FiClock, FiSearch, FiXCircle } from "react-icons/fi";
import { useMemberResource } from "./api";
import { Badge, ErrorState, PageHeading } from "./MemberUI";
import { historyDate } from "./format";
import type { HistoryItem } from "./types";
import shared from "./Members.module.css";
import styles from "./History.module.css";

function Status({ item }: { item: HistoryItem }) {
  const returned = item.status === "DIKEMBALIKAN";
  const Icon = returned ? FiCheckCircle : FiXCircle;
  const label = returned ? "Dikembalikan" : item.status === "KEDALUWARSA" ? "Reservasi Kedaluwarsa" : "Reservasi Dibatalkan";
  return <span className={returned ? styles.returned : styles.neutral}><Badge tone={returned ? "green" : "neutral"}><Icon aria-hidden />{label}</Badge></span>;
}

function activityDate(item: HistoryItem) {
  return historyDate(item.sourceType === "LOAN" ? item.borrowedAt : item.reservedAt, item.sourceType === "RESERVATION");
}

export default function HistoryPage() {
  const resource = useMemberResource<{ history: HistoryItem[] }>("loans/history");
  const history = resource.data?.history ?? [];
  return <div className={shared.pageStack}>
    <PageHeading title="Riwayat Peminjaman" description="Catatan seluruh peminjaman yang telah selesai." />
    {resource.loading ? <div className={styles.loading} role="status" aria-label="Memuat riwayat peminjaman"><span className={shared.srOnly}>Memuat riwayat peminjaman...</span><div className={styles.loadingHeader} aria-hidden />{[1, 2, 3].map(id => <div key={id} className={`${shared.skeleton} ${styles.loadingRow}`} aria-hidden />)}</div>
      : resource.error ? <ErrorState message="Riwayat peminjaman belum dapat dimuat. Silakan coba lagi." retry={resource.reload} />
      : !history.length ? <div className={`${shared.empty} ${styles.empty}`}><FiClock size={32} aria-hidden /><h2>Belum ada riwayat peminjaman.</h2><p>Peminjaman yang telah selesai akan muncul di sini.</p><Link className={shared.button} href="/koleksi"><FiSearch aria-hidden />Cari Koleksi</Link></div>
      : <>
        <div className={styles.tablePanel}><table className={styles.table}>
          <caption className={shared.srOnly}>Riwayat peminjaman dan reservasi selesai milik Anda. Tanggal reservasi menunjukkan waktu pengajuan.</caption>
          <colgroup>{[styles.titleColumn, styles.codeColumn, styles.typeColumn, styles.borrowedColumn, styles.returnedColumn, styles.extensionsColumn, styles.statusColumn].map(className => <col key={className} className={className} />)}</colgroup>
          <thead><tr>{["Judul", "Kode Buku", "Tipe", "Dipinjam", "Kembali", "Perpanjangan", "Status"].map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
          <tbody>{history.map(item => <tr key={`${item.sourceType}-${item.id}`}>
            <td><Link className={styles.title} href={`/koleksi/${item.bookId}`}>{item.title}</Link></td>
            <td>{item.bookCode}</td><td><span className={styles.type}>Fisik</span></td>
            <td>{activityDate(item)}</td><td>{historyDate(item.returnedAt)}</td><td>{item.extensionCount}×</td><td><Status item={item} /></td>
          </tr>)}</tbody>
        </table></div>
        <ul className={styles.cards} aria-label="Riwayat peminjaman">{history.map(item => <li key={`${item.sourceType}-${item.id}`}><article className={styles.card}>
          <div className={styles.cardHeading}><h2><Link className={styles.title} href={`/koleksi/${item.bookId}`}>{item.title}</Link></h2><span className={styles.type}>Fisik</span></div>
          <dl className={styles.details}><div><dt>Kode Buku</dt><dd>{item.bookCode}</dd></div><div><dt>Perpanjangan</dt><dd>{item.extensionCount}×</dd></div><div><dt>{item.sourceType === "LOAN" ? "Dipinjam" : "Diajukan"}</dt><dd>{activityDate(item)}</dd></div><div><dt>Kembali</dt><dd>{historyDate(item.returnedAt)}</dd></div></dl>
          <Status item={item} />
        </article></li>)}</ul>
      </>}
  </div>;
}
