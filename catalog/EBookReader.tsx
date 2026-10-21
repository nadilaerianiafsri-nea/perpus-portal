"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiArrowLeft } from "react-icons/fi";

import HtmlReader from "./HtmlReader";
import PdfReader from "./PdfReader";
import styles from "./Reader.module.css";
import { useReadingProgress } from "./useReadingProgress";

export default function EBookReader({
  bookId,
  source,
  title,
}: {
  bookId: number;
  source: string;
  title: string;
}) {
  const { reading, error, saveError, saving, record, flush } =
    useReadingProgress(bookId);
  const router = useRouter();
  const [closing, setClosing] = useState(false);

  async function close() {
    if (closing || !reading) return;
    setClosing(true);
    const saved = await flush();
    if (saved) {
      router.push("/dashboard/e-book");
      return;
    }
    setClosing(false);
  }

  return (
    <section className={styles.readerStage} aria-label={`Pembaca ${title}`}>
      <button aria-busy={closing} data-button="back" data-button-size="md" data-button-shape="square"
        type="button"
        className={styles.readerBackButton}
        disabled={!reading || closing}
        aria-label={closing ? "Menyimpan posisi baca" : "Kembali ke E-Book Saya"}
        onClick={() => void close()}
      >
        <FiArrowLeft size={20} aria-hidden="true" />
      </button>

      <p className={styles.srOnly} role="status" aria-live="polite">
        {!reading
          ? "Memuat riwayat bacaan."
          : saving
            ? "Menyimpan posisi baca."
            : saveError
              ? "Posisi baca belum tersimpan."
              : "Posisi baca tersimpan."}
      </p>

      {error || saveError ? (
        <div className={styles.readerErrorPanel} role="alert">
          <p>{error || saveError}</p>
          <div className={styles.errorActions}>
            {saveError ? (
              <button aria-busy={saving} data-button="primary" data-button-size="md"
                type="button"
                className={styles.secondary}
                disabled={saving}
                onClick={() => void flush()}
              >
                Coba Simpan Lagi
              </button>
            ) : null}
            <button data-button="secondary" data-button-size="md"
              type="button"
              className={styles.secondary}
              onClick={() => window.location.reload()}
            >
              Muat Ulang Pembaca
            </button>
          </div>
        </div>
      ) : null}

      {!reading ? (
        <div className={styles.readerLoading} role="status" aria-label="Memuat pembaca">
          <span className={styles.readerSpinner} aria-hidden="true" />
        </div>
      ) : source.toLowerCase().endsWith(".pdf") ? (
        <PdfReader
          source={source}
          title={title}
          initialPosition={reading.lastPosition}
          onPosition={record}
        />
      ) : (
        <HtmlReader
          source={source}
          title={title}
          initialPosition={reading.lastPosition}
          onPosition={record}
        />
      )}
    </section>
  );
}
