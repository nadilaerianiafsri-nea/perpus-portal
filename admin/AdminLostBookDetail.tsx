/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import { FiArrowLeft, FiBookOpen, FiClock, FiUser } from "react-icons/fi";
import { Button, ButtonLink } from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { safeCoverUrl } from "../shared/displayUrls.cjs";
import { lostReportLabel } from "../members/lostReport";
import { formatTransactionDateTime as dateTime, memberTypeLabel, transactionApiMessage, type LostLoanRow } from "./adminTransactions";
import styles from "./AdminLoanDetail.module.css";

type CaseLoan = LostLoanRow & { book: LostLoanRow["book"] & { author: string; shelf: string | null }; copy: LostLoanRow["copy"] & { location: string } };
type State = { key: number; loan: CaseLoan | null; error: string };
const backHref = "/admin/transaksi/buku-hilang-penggantian";

export default function AdminLostBookDetail({ id }: { id: number }) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<State>({ key: -1, loan: null, error: "" });
  const [selection, setSelection] = useState<"verify" | "complete" | null>(null);
  const [pending, setPending] = useState(false), [error, setError] = useState("");
  const locked = useRef(false), focusAfter = useRef(false), title = useRef<HTMLHeadingElement>(null);
  const loading = state.key !== revision;
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/members/admin/transactions/lost-books/${id}`, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(await transactionApiMessage(response, "Kasus buku hilang belum dapat dimuat."));
        const payload = await response.json();
        if (!controller.signal.aborted) setState({ key: revision, loan: payload.loan, error: "" });
      } catch (reason) { if (!controller.signal.aborted) setState({ key: revision, loan: null, error: reason instanceof Error ? reason.message : "Detail belum dapat dimuat." }); }
    }
    void load(); return () => controller.abort();
  }, [id, revision]);
  useEffect(() => { if (!loading && focusAfter.current) { title.current?.focus({ preventScroll: true }); focusAfter.current = false; } }, [loading]);
  const loan = state.loan;
  async function confirm() {
    if (!selection || locked.current) return;
    locked.current = true; setPending(true); setError("");
    try {
      const response = await fetch(`/api/members/admin/loans/${id}/lost${selection === "complete" ? "/complete" : ""}`, { method: "POST" });
      if (!response.ok) throw new Error(await transactionApiMessage(response, "Permintaan belum berhasil."));
      focusAfter.current = true; setSelection(null); setRevision(value => value + 1);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Permintaan belum berhasil."); }
    finally { locked.current = false; setPending(false); }
  }
  const report = loan?.lostReport;
  return <div className={styles.page}>
    <header className={styles.heading}><div className={styles.headingText}><h1 ref={title} tabIndex={-1} data-page-title>Detail Buku Hilang</h1></div><ButtonLink href={backHref} variant="back" icon={<FiArrowLeft />}>Kembali</ButtonLink></header>
    {loading ? <section className={styles.statePanel} aria-busy="true"><p>Memuat kasus buku hilang...</p></section> : state.error || !loan || !report ? <section className={styles.statePanel} role="alert"><p>{state.error || "Kasus tidak ditemukan."}</p><Button variant="secondary" onClick={() => setRevision(value => value + 1)}>Coba Lagi</Button></section> : <>
      <section className={styles.card}><h2><FiClock aria-hidden="true" />Informasi Kasus</h2><dl className={`${styles.fields} ${styles.transactionFields}`}><div><dt>Status</dt><dd>{lostReportLabel(report.status)}</dd></div><div><dt>Sumber laporan</dt><dd>{report.source === "ANGGOTA" ? "Dilaporkan Anggota" : "Dicatat Admin"}</dd></div><div><dt>Tanggal laporan</dt><dd>{report.reportedAt ? `${dateTime(report.reportedAt)} WIB` : "Tidak tercatat pada data lama"}</dd></div>{report.verifiedAt ? <div><dt>Diverifikasi</dt><dd>{dateTime(report.verifiedAt)} WIB</dd></div> : null}{report.resolvedAt ? <div><dt>Selesai</dt><dd>{dateTime(report.resolvedAt)} WIB</dd></div> : null}</dl></section>
      <div className={styles.informationGrid}>
        <section className={styles.card}><h2><FiUser aria-hidden="true" />Anggota</h2><dl className={styles.fields}><div><dt>Nama</dt><dd>{loan.member.name}</dd></div><div><dt>Jenis anggota</dt><dd>{memberTypeLabel(loan.member.memberType)}</dd></div><div><dt>Email</dt><dd>{loan.member.email}</dd></div>{loan.member.whatsapp ? <div><dt>WhatsApp</dt><dd>{loan.member.whatsapp}</dd></div> : null}</dl></section>
        <section className={styles.card}><h2><FiBookOpen aria-hidden="true" />Buku dan Pinjaman</h2><div className={styles.book}><img src={safeCoverUrl(loan.book.coverUrl)} alt={`Sampul ${loan.book.title}`} width={86} height={122} /><dl className={styles.fields}><div><dt>Judul</dt><dd>{loan.book.title}</dd></div><div><dt>Kode buku / eksemplar</dt><dd>{loan.book.code} / {loan.copy.code}</dd></div>{loan.copy.location || loan.book.shelf ? <div><dt>Lokasi / rak</dt><dd>{[loan.copy.location, loan.book.shelf].filter(Boolean).join(" / ")}</dd></div> : null}<div><dt>Dipinjam</dt><dd>{dateTime(loan.borrowedAt)} WIB</dd></div><div><dt>Jatuh tempo</dt><dd>{dateTime(loan.dueAt)} WIB</dd></div></dl></div></section>
      </div>
      <section className={styles.card}><h2>Proses Penggantian</h2>
        <p>{report.status === "MENUNGGU_VERIFIKASI" ? "Laporan anggota belum menjadi kehilangan final. Periksa laporan sebelum memverifikasi." : report.status === "SELESAI" ? "Petugas telah mencatat penyelesaian penggantian." : "Lakukan penggantian dengan buku yang sama atau sesuai kebijakan perpustakaan. Tidak ada denda uang."}</p>
        <div className={styles.detailActions}>{report.status !== "SELESAI" ? <Button disabled={pending} onClick={() => { setError(""); setSelection(report.status === "MENUNGGU_VERIFIKASI" ? "verify" : "complete"); }}>{report.status === "MENUNGGU_VERIFIKASI" ? "Verifikasi Kehilangan" : "Selesaikan Penggantian"}</Button> : null}</div>
      </section>
    </>}
    <ConfirmDialog open={selection !== null} title={selection === "verify" ? "Verifikasi Kehilangan" : "Selesaikan Penggantian"} description={selection === "verify" ? "Pastikan laporan telah diperiksa. Buku akan dinyatakan hilang dan kasus dilanjutkan ke proses penggantian." : "Pastikan penggantian telah diterima sesuai kebijakan perpustakaan. Eksemplar lama yang hilang tidak akan diaktifkan kembali."} variant={selection === "verify" ? "warning" : "success"} confirmLabel={selection === "verify" ? "Verifikasi Kehilangan" : "Selesaikan Penggantian"} pending={pending} error={error} onConfirm={confirm} onCancel={() => { if (!locked.current) setSelection(null); }} />
  </div>;
}
