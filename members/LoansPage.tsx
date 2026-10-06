"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiBookOpen } from "react-icons/fi";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import LoanCard from "./LoanCard";
import LoanDialog, { type LoanDialogSelection } from "./LoanDialog";
import { loanState } from "./format";
import type { Loan } from "./types";
import shared from "./Members.module.css";
import styles from "./Loans.module.css";

export default function LoansPage() {
  const resource = useMemberResource<{ loans: Loan[] }>("loans");
  const { refresh } = useMember();
  const [busy, setBusy] = useState<number | null>(null);
  const pending = useRef(false);
  const [selection, setSelection] = useState<LoanDialogSelection | null>(null);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);
  function open(kind: LoanDialogSelection["kind"], loan: Loan) {
    setActionError(""); setNotice(""); setSelection({ kind, loan });
  }
  async function extend() {
    if (pending.current || selection?.kind !== "extend") return;
    const loan = selection.loan;
    pending.current = true; setBusy(loan.id); setActionError(""); setNotice("");
    try {
      await memberRequest(`loans/${loan.id}/extend`, { method: "POST", body: JSON.stringify({ expectedDueAt: loan.dueAt }) });
      setSelection(null);
      setNotice("Masa pinjam berhasil diperpanjang 7 hari.");
      await Promise.all([resource.reload(), refresh()]);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Perpanjangan belum berhasil. Silakan coba lagi.");
    } finally { pending.current = false; setBusy(null); }
  }
  const urgency = (loan: Loan) => loan.status === "HILANG" ? 3 : loanState(loan, now ?? undefined).tone === "red" ? 0 : loanState(loan, now ?? undefined).tone === "orange" ? 1 : 2;
  const loans = [...(resource.data?.loans ?? [])].filter(loan => loan.status !== "DIKEMBALIKAN").sort((a, b) => urgency(a) - urgency(b) || Date.parse(a.dueAt) - Date.parse(b.dueAt));
  return <div className={shared.pageStack}>
    <PageHeading title="Pinjaman Saya" description="Kelola buku yang sedang Anda pinjam dan ajukan perpanjangan 7 hari." />
    {notice && <p className={shared.success} role="status">{notice}</p>}
    {resource.loading || now === null ? <LoadingCards /> : resource.error ? <ErrorState message="Data pinjaman belum dapat dimuat. Silakan coba lagi." retry={resource.reload} /> : !loans.length ? <div className={styles.empty}>
      <FiBookOpen size={32} aria-hidden /><h2>Belum ada buku yang sedang dipinjam.</h2><p>Buku yang sudah Anda ambil dari perpustakaan akan muncul di sini.</p><Link href="/koleksi" className={styles.extendButton}>Cari Koleksi</Link>
    </div> : <div className={styles.list}>{loans.map(loan => <LoanCard key={loan.id} loan={loan} now={now} busy={busy !== null} extending={busy === loan.id} onExtend={() => open("extend", loan)} onReplacement={() => open("replacement", loan)} />)}</div>}
    <LoanDialog selection={selection} pending={busy !== null} error={actionError} onDismiss={() => { if (!pending.current) setSelection(null); }} onConfirm={extend} />
  </div>;
}
