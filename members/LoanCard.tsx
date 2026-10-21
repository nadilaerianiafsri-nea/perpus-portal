"use client";

import { safeCoverUrl } from "../shared/displayUrls.cjs";
import Image from "next/image";
import Link from "next/link";
import { FiAlertTriangle, FiCheck, FiEye, FiInfo, FiRefreshCw, FiXCircle } from "react-icons/fi";
import { loanState, memberDate } from "./format";
import type { Loan } from "./types";
import styles from "./Loans.module.css";

export default function LoanCard({ loan, now, busy, extending, onExtend, onReplacement }: {
  loan: Loan; now: number; busy: boolean; extending: boolean;
  onExtend: () => void; onReplacement: () => void;
}) {
  const state = loanState(loan, now);
  const lost = loan.status === "HILANG";
  const label = lost ? "Buku Hilang" : state.label === "Aktif" ? "Pinjaman Aktif" : state.label === "Jatuh Tempo Besok" ? "H-1 Jatuh Tempo" : state.label;
  const warning = lost ? "Buku dinyatakan hilang — mohon lakukan penggantian (tanpa denda uang)" : state.tone === "red" ? "Pinjaman telah melewati jatuh tempo" : state.tone === "orange" ? state.label === "Jatuh Tempo Hari Ini" ? "Pinjaman jatuh tempo hari ini" : "Jatuh tempo dalam waktu dekat" : "";
  const Icon = lost ? FiXCircle : state.tone === "green" ? FiCheck : FiAlertTriangle;
  return <article className={`${styles.card} ${styles[state.tone]}`} data-record-card data-loan-id={loan.id}>
    {warning && <div className={styles.warning}><FiAlertTriangle aria-hidden /><span>{warning}</span></div>}
    <div className={styles.body}>
      <Link className={styles.cover} href={`/dashboard/koleksi/${loan.book.id}`} aria-label={`Lihat detail ${loan.book.title}`}>
        <Image src={safeCoverUrl(loan.book.coverUrl)} alt={`Sampul ${loan.book.title}`} fill sizes="96px" unoptimized />
      </Link>
      <div className={styles.information}>
        <span className={styles.badge} data-record-badge><Icon aria-hidden />{label}</span>
        <h2 data-record-primary><Link href={`/dashboard/koleksi/${loan.book.id}`}>{loan.book.title}</Link></h2>
        <p className={styles.author} data-record-secondary>{loan.book.author}</p>
        <dl className={styles.metadata}>
          <div><dt>Dipinjam</dt><dd><time dateTime={loan.borrowedAt}>{memberDate(loan.borrowedAt)}</time></dd></div>
          <div className={!lost && state.tone === "red" ? styles.overdueDate : ""}><dt>Jatuh Tempo</dt><dd className={styles.strong}><time data-record-primary dateTime={loan.dueAt}>{memberDate(loan.dueAt)}</time></dd></div>
        </dl>
        {loan.extensionCount > 0 && <p className={styles.extensionCount} data-record-secondary>Perpanjangan: {loan.extensionCount}x</p>}
      </div>
      <div className={styles.actions} data-record-action-group>
        {lost ? <button data-button="secondary" data-row-action="neutral" data-button-shape="square" title={`Info penggantian ${loan.book.title}`} aria-label={`Info penggantian ${loan.book.title}`} className={styles.replacementButton} disabled={busy} onClick={onReplacement}><FiInfo aria-hidden="true" /></button> : loan.status === "AKTIF" && <button data-button="primary" data-row-action="primary" data-button-shape="square" title={`Perpanjang pinjaman ${loan.book.title} 7 hari`} aria-label={`Perpanjang pinjaman ${loan.book.title} 7 hari`} data-button-loading={extending} aria-busy={extending} className={styles.extendButton} disabled={busy} onClick={onExtend}><FiRefreshCw aria-hidden="true" /></button>}
        <Link data-button="secondary" data-row-action="neutral" data-button-shape="square" title={`Lihat detail ${loan.book.title}`} aria-label={`Lihat detail ${loan.book.title}`} className={styles.detailLink} href={`/dashboard/koleksi/${loan.book.id}`}><FiEye aria-hidden="true" /></Link>
      </div>
    </div>
  </article>;
}
