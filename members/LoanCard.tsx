"use client";

import Image from "next/image";
import Link from "next/link";
import { FiAlertTriangle, FiCheck, FiRefreshCw, FiXCircle } from "react-icons/fi";
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
  return <article className={`${styles.card} ${styles[state.tone]}`} data-loan-id={loan.id}>
    {warning && <div className={styles.warning}><FiAlertTriangle aria-hidden /><span>{warning}</span></div>}
    <div className={styles.body}>
      <Link className={styles.cover} href={`/koleksi/${loan.book.id}`} aria-label={`Lihat detail ${loan.book.title}`}>
        <Image src={loan.book.coverUrl || "/images/landing/book-placeholder-1.svg"} alt={`Sampul ${loan.book.title}`} fill sizes="96px" unoptimized />
      </Link>
      <div className={styles.information}>
        <span className={styles.badge}><Icon aria-hidden />{label}</span>
        <h2><Link href={`/koleksi/${loan.book.id}`}>{loan.book.title}</Link></h2>
        <p className={styles.author}>{loan.book.author}</p>
        <dl className={styles.metadata}>
          <div><dt>Kode Buku</dt><dd className={styles.strong}>{loan.book.code}</dd></div>
          <div><dt>Dipinjam</dt><dd><time dateTime={loan.borrowedAt}>{memberDate(loan.borrowedAt)}</time></dd></div>
          <div className={!lost && state.tone === "red" ? styles.overdueDate : ""}><dt>Jatuh Tempo</dt><dd className={styles.strong}><time dateTime={loan.dueAt}>{memberDate(loan.dueAt)}</time></dd></div>
          <div className={styles.extensionCount}><dt>Perpanjangan:</dt><dd>{loan.extensionCount}x</dd></div>
        </dl>
      </div>
      <div className={styles.actions}>
        {lost ? <button className={styles.replacementButton} disabled={busy} onClick={onReplacement}>Info Penggantian</button> : loan.status === "AKTIF" && <button className={styles.extendButton} disabled={busy} onClick={onExtend}><FiRefreshCw aria-hidden />{extending ? "Memperpanjang..." : "Perpanjang 7 Hari"}</button>}
        <Link className={styles.detailLink} href={`/koleksi/${loan.book.id}`}>Lihat Detail</Link>
      </div>
    </div>
  </article>;
}
