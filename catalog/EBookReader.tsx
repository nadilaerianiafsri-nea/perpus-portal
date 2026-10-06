"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useReadingProgress } from "./useReadingProgress";
import HtmlReader from "./HtmlReader";
import PdfReader from "./PdfReader";
import styles from "./Reader.module.css";

export default function EBookReader({ bookId, source, title }: { bookId: number; source: string; title: string }) {
  const { reading, progress, error, saveError, saving, record, flush } = useReadingProgress(bookId);
  const router = useRouter();
  const [closing, setClosing] = useState(false);
  async function close() {
    if (closing) return;
    setClosing(true);
    const saved = await flush();
    if (saved) router.push("/dashboard/e-book");
    else setClosing(false);
  }
  return <div>
    <div className={styles.toolbar}>
      <p role="status">{reading ? `Progres membaca: ${Math.round(progress)}% · ${saving ? "Menyimpan..." : saveError ? "Belum tersimpan" : "Tersimpan"}` : "Memuat riwayat bacaan..."}</p>
      <button className={styles.primary} disabled={!reading || closing} onClick={close}>{closing ? "Menyimpan posisi..." : "Kembali ke E-Book Saya"}</button>
    </div>
    {(error || saveError) && <div className={styles.error} role="alert">{error || saveError}<div className={styles.errorActions}>{saveError && <button className={styles.secondary} disabled={saving} onClick={() => void flush()}>Coba Simpan Lagi</button>}<button className={styles.secondary} onClick={() => window.location.reload()}>Muat Ulang Pembaca</button></div></div>}
    {reading && (source.toLowerCase().endsWith(".pdf") ? <PdfReader source={source} title={title} initialPosition={reading.lastPosition} onPosition={record} /> : <HtmlReader source={source} title={title} initialPosition={reading.lastPosition} onPosition={record} />)}
  </div>;
}
