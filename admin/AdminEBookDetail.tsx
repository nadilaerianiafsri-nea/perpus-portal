/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiArrowLeft, FiEdit2, FiPower } from "react-icons/fi";
import {
  accessModeLabel,
  ebookApiMessage,
  type AdminEBookDetail,
  type AdminEBookDetailResponse,
} from "./adminEBooks";
import styles from "./AdminBooks.module.css";

export default function AdminEBookDetailPage({ id }: { id: string }) {
  const [book, setBook] = useState<AdminEBookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/ebooks/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await ebookApiMessage(response, "Detail E-Book belum dapat dimuat."));
      }
      const payload = (await response.json()) as AdminEBookDetailResponse;
      setBook(payload.book);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Detail E-Book belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus() {
    if (!book || changingStatus) return;
    const next = !book.isActive;
    const approved = window.confirm(
      next
        ? `Aktifkan kembali “${book.title}” di katalog?`
        : `Nonaktifkan “${book.title}” dari katalog pengunjung?`,
    );
    if (!approved) return;

    setChangingStatus(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/ebooks/${book.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!response.ok) {
        throw new Error(await ebookApiMessage(response, "Status E-Book gagal diubah."));
      }
      const payload = (await response.json()) as AdminEBookDetailResponse;
      setBook(payload.book);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Status E-Book gagal diubah.");
    } finally {
      setChangingStatus(false);
    }
  }

  if (loading) return <div className={styles.statePanel}>Memuat detail E-Book...</div>;

  if (!book) {
    return (
      <div className={styles.statePanel} role="alert">
        <p>{error || "E-Book tidak ditemukan."}</p>
        <button type="button" onClick={() => void load()}>Coba Lagi</button>
      </div>
    );
  }

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailHeading}>
        <div>
          <div className={styles.localBreadcrumb}>
            <Link href="/admin/koleksi/e-book">E-Book</Link>
            <span>/</span>
            <strong>{book.title}</strong>
          </div>
          <h1>Detail E-Book</h1>
        </div>
        <Link href="/admin/koleksi/e-book" className={styles.backButton}>
          <FiArrowLeft aria-hidden />
          Kembali
        </Link>
      </div>

      {error ? <div className={styles.inlineError} role="alert">{error}</div> : null}

      <section className={styles.detailHero}>
        <img className={styles.detailCover} src={book.coverUrl || "/images/landing/book-placeholder-1.svg"} alt={`Sampul ${book.title}`} />
        <div className={styles.heroInfo}>
          <div className={styles.heroBadges}>
            <span>E-Book</span>
            <span className={book.isActive ? styles.heroActive : styles.heroInactive}>
              {book.isActive ? "Aktif" : "Nonaktif"}
            </span>
          </div>
          <h2>{book.title}</h2>
          <p>{book.author} · {book.publisher} · {book.year}</p>
          <strong className={styles.codeBadge}>{book.code}</strong>
        </div>
        <div className={styles.heroActions}>
          <Link href={`/admin/koleksi/e-book/${book.id}/edit`} className={styles.yellowAction}>
            <FiEdit2 aria-hidden />
            Edit
          </Link>
          <button type="button" className={styles.darkAction} onClick={() => void toggleStatus()} disabled={changingStatus}>
            <FiPower aria-hidden />
            {changingStatus ? "Memproses..." : book.isActive ? "Nonaktifkan" : "Aktifkan"}
          </button>
        </div>
      </section>

      <div className={styles.detailGrid}>
        <section className={styles.detailPanel}>
          <h3>Informasi Bibliografi</h3>
          <dl className={styles.infoList}>
            <div><dt>JUDUL</dt><dd>{book.title}</dd></div>
            <div><dt>PENULIS / PENGARANG</dt><dd>{book.author}</dd></div>
            <div><dt>ISBN/ISSN</dt><dd>{book.isbnIssn || "—"}</dd></div>
            <div><dt>PENERBIT · TAHUN</dt><dd>{book.publisher} · {book.year}</dd></div>
            <div><dt>EDISI · BAHASA</dt><dd>{book.edition || "—"} · {book.language}</dd></div>
            <div><dt>SUBJEK / KATEGORI</dt><dd>{book.subject}</dd></div>
          </dl>
        </section>

        <section className={styles.detailPanel}>
          <h3>Akses Digital</h3>
          <dl className={styles.infoList}>
            <div><dt>MODE AKSES</dt><dd><span className={styles.modePill}>{accessModeLabel(book.accessMode)}</span></dd></div>
            <div>
              <dt>SUMBER / TAUTAN</dt>
              <dd>
                {book.ebookUrl ? (
                  <a className={styles.digitalLink} href={book.ebookUrl} target="_blank" rel="noreferrer">Buka sumber E-Book</a>
                ) : "Tidak tersedia"}
              </dd>
            </div>
            <div><dt>DURASI AKSES</dt><dd>{book.accessDurationDays ? `${book.accessDurationDays} hari` : "Tidak dibatasi"}</dd></div>
            <div><dt>CATATAN LISENSI</dt><dd>{book.licenseNote || "—"}</dd></div>
          </dl>
        </section>
      </div>

      <section className={styles.detailPanel}>
        <h3>Deskripsi</h3>
        <p className={styles.description}>{book.description}</p>
      </section>
    </div>
  );
}
