"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import { FiClock, FiInfo, FiMapPin, FiMail, FiPhone } from "react-icons/fi";
import { serviceInfo } from "@/shared/serviceInfo.cjs";
import { memberDate } from "./format";
import type { Loan } from "./types";
import styles from "./Loans.module.css";

export type LoanDialogSelection = { kind: "extend" | "replacement"; loan: Loan };

export default function LoanDialog({ selection, pending, error, onDismiss, onConfirm }: {
  selection: LoanDialogSelection | null; pending: boolean; error: string;
  onDismiss: () => void; onConfirm: () => void;
}) {
  const extending = selection?.kind === "extend";
  return <ConfirmDialog
    open={selection !== null}
    title={extending ? "Konfirmasi Perpanjangan" : "Informasi Penggantian Buku"}
    description={extending
      ? "Masa pinjam akan diperpanjang selama 7 hari dari tanggal jatuh tempo saat ini."
      : "Buku ini telah dinyatakan hilang. Silakan hubungi petugas perpustakaan untuk proses penggantian dengan buku yang sama atau mengikuti kebijakan perpustakaan yang berlaku."}
    variant={extending ? "primary" : "info"}
    icon={extending ? <FiClock aria-hidden /> : <FiInfo aria-hidden />}
    confirmLabel={extending ? "Perpanjang 7 Hari" : undefined}
    cancelLabel={extending ? "Batal" : "Tutup"}
    loadingLabel="Memperpanjang..."
    pending={pending}
    error={error}
    onCancel={onDismiss}
    onConfirm={extending ? onConfirm : undefined}
  >
    {selection && <>
      <p><strong>{selection.loan.book.title}</strong></p>
      {extending ?
        <dl className={styles.dialogDates}>
          <div><dt>Jatuh tempo saat ini:</dt><dd>{memberDate(selection.loan.dueAt, true)}</dd></div>
          <div><dt>Jatuh tempo setelah perpanjangan:</dt><dd>{memberDate(new Date(Date.parse(selection.loan.dueAt) + 7 * 86400000).toISOString(), true)}</dd></div>
        </dl>
       : <>
        <p>Tidak ada denda uang.</p>
        <address className={styles.contact}>
          <a href={serviceInfo.phoneUrl}><FiPhone aria-hidden />{serviceInfo.phone}</a>
          <a href={`mailto:${serviceInfo.email}`}><FiMail aria-hidden />{serviceInfo.email}</a>
          <p><FiMapPin aria-hidden /><span>{serviceInfo.address}</span></p>
        </address>
      </>}
    </>}
  </ConfirmDialog>;
}
