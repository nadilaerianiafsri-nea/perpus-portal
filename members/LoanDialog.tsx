"use client";

import { useEffect, useRef } from "react";
import { FiMapPin, FiMail, FiPhone } from "react-icons/fi";
import { serviceInfo } from "@/shared/serviceInfo.cjs";
import { memberDate } from "./format";
import type { Loan } from "./types";
import styles from "./Loans.module.css";

export type LoanDialogSelection = { kind: "extend" | "replacement"; loan: Loan };

export default function LoanDialog({ selection, pending, error, onDismiss, onConfirm }: {
  selection: LoanDialogSelection | null; pending: boolean; error: string;
  onDismiss: () => void; onConfirm: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    if (selection && !element?.open) element?.showModal();
    if (!selection && element?.open) element.close();
  }, [selection]);
  const extending = selection?.kind === "extend";
  return <dialog ref={dialog} className={styles.dialog} aria-labelledby="loan-dialog-title" onClose={onDismiss} onCancel={event => { if (pending) event.preventDefault(); }}>
    {selection && <>
      <h2 id="loan-dialog-title">{extending ? "Perpanjang Masa Pinjam" : "Informasi Penggantian Buku"}</h2>
      <p className={styles.dialogBook}>{selection.loan.book.title}</p>
      {extending ? <>
        <p>Masa pinjam akan diperpanjang selama 7 hari dari tanggal jatuh tempo saat ini.</p>
        <dl className={styles.dialogDates}>
          <div><dt>Jatuh tempo saat ini:</dt><dd>{memberDate(selection.loan.dueAt, true)}</dd></div>
          <div><dt>Jatuh tempo setelah perpanjangan:</dt><dd>{memberDate(new Date(Date.parse(selection.loan.dueAt) + 7 * 86400000).toISOString(), true)}</dd></div>
        </dl>
      </> : <>
        <p>Buku ini telah dinyatakan hilang. Silakan hubungi petugas perpustakaan untuk proses penggantian dengan buku yang sama atau mengikuti kebijakan perpustakaan yang berlaku.</p>
        <p>Tidak ada denda uang.</p>
        <address className={styles.contact}>
          <a href={serviceInfo.phoneUrl}><FiPhone aria-hidden />{serviceInfo.phone}</a>
          <a href={`mailto:${serviceInfo.email}`}><FiMail aria-hidden />{serviceInfo.email}</a>
          <p><FiMapPin aria-hidden /><span>{serviceInfo.address}</span></p>
        </address>
      </>}
      {error && <p role="alert" className={styles.dialogError}>{error}</p>}
      <div className={styles.dialogActions}>
        <button className={styles.replacementButton} disabled={pending} onClick={onDismiss}>{extending ? "Batal" : "Tutup"}</button>
        {extending && <button className={styles.extendButton} disabled={pending} onClick={onConfirm}>{pending ? "Memperpanjang..." : "Perpanjang 7 Hari"}</button>}
      </div>
    </>}
  </dialog>;
}
