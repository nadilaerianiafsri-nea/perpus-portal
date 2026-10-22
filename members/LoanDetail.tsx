/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiBookOpen, FiClock, FiInfo } from "react-icons/fi";
import { Button, ButtonLink } from "@/components/Button";
import { safeCoverUrl } from "@/shared/displayUrls.cjs";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { memberDate } from "./format";
import { canReportLost, canExtendReportedLoan, lostReportLabel } from "./lostReport";
import LoanDialog, { type LoanDialogSelection } from "./LoanDialog";
import type { Loan } from "./types";
import styles from "../admin/AdminLoanDetail.module.css";

export default function LoanDetail({ id }: { id: number }) {
  const resource = useMemberResource<{ loan: Loan }>(`loans/${id}`);
  const { refresh } = useMember();
  const [selection, setSelection] = useState<LoanDialogSelection | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false), focusAfter = useRef(false);
  const reportHeading = useRef<HTMLElement>(null);
  const loan = resource.data?.loan;
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
  return <div className={styles.page}>
    <header className={styles.heading}><div className={styles.headingText}><h1 data-page-title>Detail Pinjaman</h1></div><ButtonLink variant="back" href="/dashboard/pinjaman" icon={<FiArrowLeft />}>Kembali</ButtonLink></header>
    {resource.loading ? <section className={styles.statePanel} aria-busy="true"><p>Memuat detail pinjaman...</p></section> : resource.error || !loan ? <section className={styles.statePanel} role="alert"><p>{resource.error || "Pinjaman tidak ditemukan."}</p><Button variant="secondary" onClick={resource.reload}>Coba Lagi</Button></section> : <>
      <div className={styles.informationGrid}>
        <section className={styles.card}><h2><FiBookOpen aria-hidden="true" />Buku</h2><div className={styles.book}><img src={safeCoverUrl(loan.book.coverUrl)} alt={`Sampul ${loan.book.title}`} width={86} height={122} /><dl className={styles.fields}><div><dt>Judul</dt><dd className={styles.prominent}>{loan.book.title}</dd></div><div><dt>Kode buku</dt><dd>{loan.book.code}</dd></div></dl></div></section>
        <section className={styles.card}><h2><FiClock aria-hidden="true" />Pinjaman</h2><dl className={styles.fields}><div><dt>Dipinjam</dt><dd>{memberDate(loan.borrowedAt, true)}</dd></div><div><dt>Jatuh tempo</dt><dd>{memberDate(loan.dueAt, true)}</dd></div></dl></section>
      </div>
      <section ref={reportHeading} tabIndex={-1} className={styles.card} id="member-loan-report" aria-labelledby="member-report-title"><h2 id="member-report-title"><FiInfo aria-hidden="true" />{loan.lostReport ? "Laporan Kehilangan" : "Status Pinjaman"}</h2>
        {loan.lostReport ? <dl className={`${styles.fields} ${styles.transactionFields}`}><div><dt>Status laporan</dt><dd>{lostReportLabel(loan.lostReport.status)}</dd></div>{loan.lostReport.reportedAt ? <div><dt>Tanggal laporan</dt><dd>{memberDate(loan.lostReport.reportedAt, true)}</dd></div> : null}{loan.lostReport.verifiedAt ? <div><dt>Diverifikasi</dt><dd>{memberDate(loan.lostReport.verifiedAt, true)}</dd></div> : null}{loan.lostReport.resolvedAt ? <div><dt>Selesai</dt><dd>{memberDate(loan.lostReport.resolvedAt, true)}</dd></div> : null}</dl>
          : <p>{loan.status === "AKTIF" ? "Pinjaman Aktif" : loan.status === "DIKEMBALIKAN" ? "Dikembalikan" : "Buku Hilang"}</p>}
        {loan.lostReport?.status === "MENUNGGU_VERIFIKASI" ? <p>Laporan Anda sedang menunggu verifikasi petugas.</p> : loan.lostReport?.status === "PROSES_PENGGANTIAN" ? <p>Hubungi petugas untuk penggantian dengan buku yang sama atau sesuai kebijakan perpustakaan. Tidak ada denda uang.</p> : null}
      </section>
      <div className={styles.detailActions}>
        {canExtendReportedLoan(loan) ? <Button disabled={pending} onClick={() => open("extend")}>Perpanjang</Button> : null}
        {canReportLost(loan) ? <Button variant="secondary" rowAction="danger-soft" disabled={pending} onClick={() => open("report")} aria-label={`Laporkan buku ${loan.book.title} sebagai hilang`}>Laporkan Buku Hilang</Button> : null}
      </div>
    </>}
    <LoanDialog selection={selection} pending={pending} error={error} onDismiss={() => { if (!locked.current) setSelection(null); }} onConfirm={confirm} />
  </div>;
}
