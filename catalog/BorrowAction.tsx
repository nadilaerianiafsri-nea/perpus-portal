"use client";
import { useState } from "react";
import styles from "./Catalog.module.css";
export default function BorrowAction({ available }: { available: boolean }) {
  const [notice, setNotice] = useState(false);
  return (
    <>
      <button
        className={styles.primaryButton}
        disabled={!available}
        onClick={() => setNotice(true)}
      >
        {available ? "Ajukan Peminjaman" : "Tidak Tersedia"}
      </button>
      {notice && (
        <p className={styles.ctaNotice} role="status">
          Layanan pengajuan peminjaman belum tersedia. Silakan hubungi petugas
          perpustakaan.
        </p>
      )}
    </>
  );
}
