/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiArrowLeft, FiBookOpen, FiClock, FiInfo, FiRefreshCw } from "react-icons/fi";
import { Button, ButtonLink } from "@/components/Button";
import { safeCoverUrl } from "@/shared/displayUrls.cjs";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { loanState, memberDate } from "./format";
import { canReportLost, canExtendReportedLoan, lostReportLabel } from "./lostReport";
import LoanDialog, { type LoanDialogSelection } from "./LoanDialog";
import type { Loan } from "./types";
import styles from "../admin/AdminLoanDetail.module.css";
import ui from "./LoanDetail.module.css";

export default function LoanDetail({ id }: { id: number }) {
  const resource = useMemberResource<{ loan: Loan }>(`loans/${id}`);
  const { refresh } = useMember();
  const [selection, setSelection] = useState<LoanDialogSelection | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false), focusAfter = useRef(false);
  const reportHeading = useRef<HTMLElement>(null);
  const loan = resource.data?.loan;
  const overdue = loan?.status === "AKTIF" && !loan.lostReport && loanState(loan).tone === "red";
  useEffect(() => {
    if (!resource.loading && focusAfter.current) { reportHeading.current?.focus({ preventScroll: true }); focusAfter.current = false; }
  }, [resource.loading, resource.data]);
  function open(kind: LoanDialogSelection["kind"]) { if (loan && !locked.current) { setError(""); setSelection({ kind, loan }); } }
  async function confirm() {
    if (!selection || selection.kind === "replacement" || locked.current) return;
    locked.current = true; setPending(true); setError("");
    const reporting = selection.kind === "report";
    try {
      await memberRequest(`loans/${id}/${reporting ? "lost-report" : "extend"}`, { method: "POST", body: JSON.stringify(reporting ? {} : { expectedDueAt: selection.loan.dueAt }) });
      focusAfter.current = true; setSelection(null);
      await Promise.all([resource.reload(), refresh()]);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Permintaan belum berhasil."); }
    finally { locked.current = false; setPending(false); }
  }
  return <div className={`${styles.page} ${ui.page}`}>
    <header className={styles.heading}>
      <div className={styles.headingText}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/dashboard/pinjaman">Pinjaman Saya</Link><span aria-hidden="true">/</span><span aria-current="page">Detail Pinjaman</span></nav>
        <h1 data-page-title>Detail Pinjaman</h1>
      </div>
      <ButtonLink variant="back" href="/dashboard/pinjaman" icon={<FiArrowLeft />}>Kembali</ButtonLink>
    </header>
    {resource.loading ? <section className={styles.statePanel} aria-busy="true"><p>Memuat detail pinjaman...</p></section> : resource.error || !loan ? <section className={styles.statePanel} role="alert"><p>{resource.error || "Pinjaman tidak ditemukan."}</p><Button variant="secondary" onClick={resource.reload}>Coba Lagi</Button></section> : <>
      <div className={styles.informationGrid}>
        <section className={`${styles.card} ${ui.card}`} aria-labelledby="member-loan-book-title">
          <h2 id="member-loan-book-title"><FiBookOpen aria-hidden="true" />Buku</h2>
          <div className={styles.book}>
            <img src={safeCoverUrl(loan.book.coverUrl)} alt={`Sampul ${loan.book.title}`} width={86} height={122} />
            <dl className={`${styles.fields} ${ui.fields}`}>
              <div><dt>Judul</dt><dd className={styles.prominent}>{loan.book.title}</dd></div>
              {loan.book.author ? <div><dt>Penulis</dt><dd>{loan.book.author}</dd></div> : null}
              <div><dt>Kode buku</dt><dd>{loan.book.code}</dd></div>
            </dl>
          </div>
        </section>
        <section ref={loan.lostReport ? undefined : reportHeading} tabIndex={-1} className={`${styles.card} ${ui.card}`} aria-labelledby="member-loan-information-title">
          <h2 id="member-loan-information-title"><FiClock aria-hidden="true" />Informasi Pinjaman</h2>
          <dl className={`${styles.fields} ${ui.fields} ${ui.loanFields}`}>
            <div><dt>Status</dt><dd><span className={`${styles.status} ${loan.status === "HILANG" ? styles.warning : overdue ? styles.danger : styles.success}`}>{loan.status === "AKTIF" ? "Pinjaman Aktif" : loan.status === "DIKEMBALIKAN" ? "Dikembalikan" : "Buku Hilang"}</span></dd></div>
            <div><dt>Tanggal dipinjam</dt><dd><time dateTime={loan.borrowedAt}>{memberDate(loan.borrowedAt, true)}</time></dd></div>
            <div className={overdue ? ui.overdue : undefined}><dt>Jatuh tempo</dt><dd><time dateTime={loan.dueAt}>{memberDate(loan.dueAt, true)}</time>{overdue ? <span className={ui.overdueHint}>Melewati jatuh tempo</span> : null}</dd></div>
            <div><dt>Jumlah perpanjangan</dt><dd>{loan.extensionCount} kali</dd></div>
            {loan.returnedAt ? <div><dt>Dikembalikan</dt><dd><time dateTime={loan.returnedAt}>{memberDate(loan.returnedAt, true)}</time></dd></div> : null}
          </dl>
        </section>
      </div>
      {loan.lostReport ? <section ref={reportHeading} tabIndex={-1} className={`${styles.card} ${ui.card}`} id="member-loan-report" aria-labelledby="member-report-title">
        <h2 id="member-report-title"><FiInfo aria-hidden="true" />Laporan Buku Hilang</h2>
        <dl className={`${styles.fields} ${ui.fields} ${styles.transactionFields}`}>
          <div><dt>Status laporan</dt><dd><span className={`${styles.status} ${loan.lostReport.status === "SELESAI" ? styles.success : styles.warning}`}>{lostReportLabel(loan.lostReport.status)}</span></dd></div>
          {loan.lostReport.reportedAt ? <div><dt>Tanggal laporan</dt><dd>{memberDate(loan.lostReport.reportedAt, true)}</dd></div> : null}
          {loan.lostReport.verifiedAt ? <div><dt>Diverifikasi</dt><dd>{memberDate(loan.lostReport.verifiedAt, true)}</dd></div> : null}
          {loan.lostReport.resolvedAt ? <div><dt>Selesai</dt><dd>{memberDate(loan.lostReport.resolvedAt, true)}</dd></div> : null}
        </dl>
        {loan.lostReport?.status === "MENUNGGU_VERIFIKASI" ? <p>Laporan Anda sedang menunggu verifikasi petugas.</p> : loan.lostReport?.status === "PROSES_PENGGANTIAN" ? <p>Hubungi petugas untuk penggantian dengan buku yang sama atau sesuai kebijakan perpustakaan. Tidak ada denda uang.</p> : null}
      </section> : null}
      {canExtendReportedLoan(loan) || canReportLost(loan) ? <div className={ui.actions} role="group" aria-label="Aksi pinjaman">
        {canExtendReportedLoan(loan) ? <Button accentHover icon={<FiRefreshCw />} disabled={pending} onClick={() => open("extend")} aria-label={`Perpanjang pinjaman ${loan.book.title} 7 hari`}>Perpanjang</Button> : null}
        {canReportLost(loan) ? <Button variant="secondary" rowAction="danger-soft" disabled={pending} onClick={() => open("report")} aria-label={`Laporkan buku ${loan.book.title} sebagai hilang`}>Laporkan Buku Hilang</Button> : null}
      </div> : null}
    </>}
    <LoanDialog selection={selection} pending={pending} error={error} onDismiss={() => { if (!locked.current) setSelection(null); }} onConfirm={confirm} />
  </div>;
}
