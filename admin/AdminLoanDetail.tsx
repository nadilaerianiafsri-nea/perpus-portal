/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiBookOpen, FiClock, FiInfo, FiUser } from "react-icons/fi";
import { Button, ButtonLink } from "@/components/Button";
import { safeCoverUrl } from "../shared/displayUrls.cjs";
import { formatTransactionDateTime, memberTypeLabel } from "./adminTransactions";
import { ebookDetailStatus, loadEbookAccess, loadPhysicalLoan, loanDetailStatus, type EbookAccessDetail, type PhysicalLoanDetail } from "./adminLoanDetails";
import styles from "./AdminLoanDetail.module.css";
import { overdueDays } from '../shared/loanOverdue.cjs';

type Detail = { kind: "physical"; row: PhysicalLoanDetail } | { kind: "ebook"; row: EbookAccessDetail };
type LoadState = { key: string; loading: boolean; detail: Detail | null; error: string };

export function LoanDetailCards({ detail }: { detail: Detail }) {
  const { member, book } = detail.row;
  const status = detail.kind === "physical" ? loanDetailStatus(detail.row) : ebookDetailStatus(detail.row.endsAt);

  return (
    <>
      <section className={styles.card} aria-labelledby="loan-information-title">
        <h2 id="loan-information-title"><FiClock aria-hidden="true" />{detail.kind === "physical" ? "Informasi Peminjaman" : "Informasi Akses"}</h2>
        <dl className={`${styles.fields} ${styles.transactionFields}`}>
          <div><dt>Status {detail.kind === "physical" ? "peminjaman" : "akses"}</dt><dd><span className={`${styles.status} ${styles[status.tone]}`}>{status.label}</span></dd></div>
          {detail.kind === "physical" ? (
            <>
              <div><dt>Waktu peminjaman</dt><dd>{formatTransactionDateTime(detail.row.borrowedAt)} WIB</dd></div>
              <div><dt>Jatuh tempo</dt><dd>{formatTransactionDateTime(detail.row.dueAt)} WIB</dd></div>
              {detail.row.status === 'AKTIF' && overdueDays(detail.row.dueAt) > 0 ? <div><dt>Jumlah hari terlambat</dt><dd>{overdueDays(detail.row.dueAt)} hari</dd></div> : null}
              <div><dt>Jumlah perpanjangan</dt><dd>{detail.row.extensionCount} kali</dd></div>
              {detail.row.returnedAt ? <div><dt>Waktu pengembalian</dt><dd>{formatTransactionDateTime(detail.row.returnedAt)} WIB</dd></div> : null}
            </>
          ) : (
            <>
              <div><dt>Waktu ditambahkan</dt><dd>{formatTransactionDateTime(detail.row.addedAt)} WIB</dd></div>
              <div><dt>Batas akses</dt><dd>{detail.row.endsAt ? `${formatTransactionDateTime(detail.row.endsAt)} WIB` : "Tanpa batas waktu"}</dd></div>
              <div><dt>Terakhir dibuka</dt><dd>{detail.row.lastOpenedAt ? `${formatTransactionDateTime(detail.row.lastOpenedAt)} WIB` : "Belum pernah dibuka"}</dd></div>
              <div><dt>Progres baca</dt><dd>{Math.round(Math.min(100, Math.max(0, detail.row.progress)))}%</dd></div>
            </>
          )}
        </dl>
      </section>

      <div className={styles.informationGrid}>
        <section className={styles.card} aria-labelledby="loan-member-title">
          <h2 id="loan-member-title"><FiUser aria-hidden="true" />Informasi Anggota</h2>
          <dl className={styles.fields}>
            <div><dt>Nama anggota</dt><dd className={styles.prominent}>{member.name}</dd></div>
            <div><dt>Jenis anggota</dt><dd>{memberTypeLabel(member.memberType)}</dd></div>
            <div><dt>Email</dt><dd>{member.email || "—"}</dd></div>
            <div><dt>WhatsApp</dt><dd>{member.whatsapp || "—"}</dd></div>
          </dl>
        </section>

        <section className={styles.card} aria-labelledby="loan-book-title">
          <h2 id="loan-book-title"><FiBookOpen aria-hidden="true" />Informasi Buku</h2>
          <div className={styles.book}>
            <img src={safeCoverUrl(book.coverUrl)} alt={`Sampul ${book.title}`} width={86} height={122} />
            <dl className={styles.fields}>
              <div><dt>Judul buku</dt><dd className={styles.prominent}>{book.title}</dd></div>
              <div><dt>Kode buku</dt><dd>{book.code}</dd></div>
              {detail.kind === "physical" ? <div><dt>Kode eksemplar</dt><dd>{detail.row.copy.code}</dd></div> : <div><dt>Penulis</dt><dd>{detail.row.book.author || "—"}</dd></div>}
            </dl>
          </div>
          {detail.kind === "physical" ? (
            <dl className={`${styles.fields} ${styles.locationFields}`}>
              <div><dt>Lokasi eksemplar</dt><dd>{detail.row.copy.location || "—"}</dd></div>
              <div><dt>Rak</dt><dd>{detail.row.book.shelf || "—"}</dd></div>
            </dl>
          ) : null}
        </section>
      </div>
    </>
  );
}

export default function AdminLoanDetail({ id, kind, backHref = '/admin/transaksi/peminjaman' }: { id: number; kind: Detail["kind"]; backHref?: string }) {
  const [revision, setRevision] = useState(0);
  const requestKey = `${kind}:${id}:${revision}`;
  const [state, setState] = useState<LoadState>({ key: "", loading: true, detail: null, error: "" });
  const title = kind === "physical" ? "Detail Peminjaman" : "Detail Akses E-Book";
  const subject = kind === "physical" ? "peminjaman" : "akses e-book";

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const row = kind === "physical" ? await loadPhysicalLoan(id, controller.signal) : await loadEbookAccess(id, controller.signal);
        if (controller.signal.aborted) return;
        const detail: Detail | null = row === null ? null : kind === "physical"
          ? { kind, row: row as PhysicalLoanDetail } : { kind, row: row as EbookAccessDetail };
        setState({ key: requestKey, loading: false, detail, error: "" });
      } catch (reason) {
        if (!controller.signal.aborted) setState({ key: requestKey, loading: false, detail: null, error: reason instanceof Error ? reason.message : "Detail belum dapat dimuat." });
      }
    }
    void load();
    return () => controller.abort();
  }, [id, kind, requestKey]);

  const loading = state.key !== requestKey || state.loading;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingText}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href={backHref}>{backHref === '/admin/transaksi/terlambat' ? 'Terlambat' : 'Peminjaman'}</Link><span aria-hidden="true">/</span><span aria-current="page">{title}</span>
          </nav>
          <h1 data-page-title>{title}</h1>
        </div>
        <ButtonLink href={backHref} variant="back" icon={<FiArrowLeft />}>Kembali</ButtonLink>
      </header>

      {loading ? (
        <section className={styles.statePanel} aria-live="polite" aria-busy="true"><FiClock aria-hidden="true" /><p>Memuat detail {subject}...</p></section>
      ) : state.error ? (
        <section className={styles.statePanel} role="alert">
          <FiInfo aria-hidden="true" /><h2>Detail {subject} belum dapat ditampilkan</h2><p>{state.error}</p>
          <Button variant="secondary" onClick={() => setRevision(value => value + 1)}>Coba Lagi</Button>
        </section>
      ) : state.detail === null ? (
        <section className={styles.statePanel}>
          <FiInfo aria-hidden="true" /><h2>{kind === "physical" ? "Peminjaman" : "Akses e-book"} tidak ditemukan</h2>
          <p>Data ini tidak tersedia. Kembali ke daftar untuk memilih {subject} lain.</p>
          <Button variant="secondary" onClick={() => setRevision(value => value + 1)}>Coba Lagi</Button>
        </section>
      ) : <LoanDetailCards detail={state.detail} />}
    </div>
  );
}
