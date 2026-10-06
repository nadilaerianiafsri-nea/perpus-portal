"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiCalendar, FiRefreshCw } from "react-icons/fi";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { Badge, BookCover, EmptyState, ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import { loanState, memberDate } from "./format";
import type { Loan } from "./types";
import styles from "./Members.module.css";

export default function LoansPage() {
  const resource = useMemberResource<{ loans: Loan[] }>("loans");
  const { refresh } = useMember();
  const [busy, setBusy] = useState<number | null>(null);
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState<number | undefined>();
  useEffect(() => { const tick = () => setNow(Date.now()); tick(); const timer = window.setInterval(tick, 60000); return () => window.clearInterval(timer); }, []);
  async function extend(id: number) {
    if (pending.current) return;
    pending.current = true; setBusy(id); setActionError(""); setNotice("");
    try { await memberRequest(`loans/${id}/extend`, { method: "POST" }); setNotice("Perpanjangan berhasil. Jatuh tempo ditambah 7 hari."); await Promise.all([resource.reload(), refresh()]); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Perpanjangan belum berhasil. Silakan coba lagi."); }
    finally { pending.current = false; setBusy(null); }
  }
  return <div className={styles.pageStack}><PageHeading title="Pinjaman Saya" description="Masa pinjam 7 hari sejak pengambilan dikonfirmasi petugas. Setiap perpanjangan menambah 7 hari." />{notice && <p className={styles.success} role="status">{notice}</p>}{actionError && <p className={styles.error} role="alert">{actionError}</p>}
    {resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : !resource.data?.loans.length ? <EmptyState message="Belum ada buku yang sedang dipinjam." href="/koleksi" /> : resource.data.loans.map(loan => { const state = loanState(loan, now); return <article className={`${styles.card} ${styles.bookRow}`} key={loan.id}><BookCover book={loan.book} /><div className={styles.bookInfo}><Link href={`/koleksi/${loan.book.id}`}><h2>{loan.book.title}</h2></Link><Badge tone={state.tone}>{state.label}</Badge><dl className={styles.details}><div><dt>Kode Buku</dt><dd>{loan.book.code}</dd></div><div><dt>Kode Eksemplar</dt><dd>{loan.copy.code}</dd></div><div><dt>Tanggal Dipinjam</dt><dd>{memberDate(loan.borrowedAt, true)}</dd></div><div><dt>Jatuh Tempo</dt><dd>{memberDate(loan.dueAt, true)}</dd></div><div><dt>Jumlah Perpanjangan</dt><dd>{loan.extensionCount} kali</dd></div></dl>{state.tone === "red" && <p className={styles.formError}>{loan.status === "HILANG" ? "Hubungi petugas untuk penanganan buku hilang." : "Tidak ada denda. Mohon segera kembalikan buku atau perpanjang masa pinjam."}</p>}</div><div className={styles.rowActions}><span className={styles.timeLeft}><FiCalendar /> {state.remaining}</span>{loan.status === "AKTIF" && <button className={styles.button} disabled={busy !== null} onClick={() => extend(loan.id)}><FiRefreshCw />{busy === loan.id ? "Memperpanjang..." : "Perpanjang +7 Hari"}</button>}</div></article>; })}
  </div>;
}
