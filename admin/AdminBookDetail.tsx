/* eslint-disable @next/next/no-img-element */
"use client";

import { safeCoverUrl } from "../shared/displayUrls.cjs";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import StatCard from "@/components/StatCard";
import { useCallback, useEffect, useState } from "react";
import { FiArrowLeft, FiCheckCircle, FiEdit2, FiPower } from "react-icons/fi";
import {
  adminDate,
  apiMessage,
  type AdminBookDetail,
  type AdminBookDetailResponse,
} from "./adminBooks";
import styles from "./AdminBooks.module.css";

export default function AdminBookDetailPage({ id }: { id: string }) {
  const [book, setBook] = useState<AdminBookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/books/${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await apiMessage(response, "Detail buku belum dapat dimuat."));
      }
      const payload = (await response.json()) as AdminBookDetailResponse;
      setBook(payload.book);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Detail buku belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Existing fetch lifecycle starts the loading state before requesting data.
    void load();
  }, [load]);

  async function toggleStatus() {
    if (!book || changingStatus) return;
    const next = !book.isActive;
    setChangingStatus(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/books/${book.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!response.ok) {
        throw new Error(await apiMessage(response, "Status buku gagal diubah."));
      }
      const payload = (await response.json()) as AdminBookDetailResponse;
      setBook(payload.book);
      setStatusDialogOpen(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Status buku gagal diubah.",
      );
    } finally {
      setChangingStatus(false);
    }
  }

  if (loading) {
    return <div className={styles.statePanel}>Memuat detail buku...</div>;
  }

  if (!book) {
    return (
      <div className={styles.statePanel} role="alert">
        <p>{error || "Buku tidak ditemukan."}</p>
        <button data-button="secondary" data-button-size="md" type="button" onClick={() => void load()}>
          Coba Lagi
        </button>
      </div>
    );
  }

  const stockPercent = book.totalCopies
    ? Math.round((book.availableCopies / book.totalCopies) * 100)
    : 0;

  return (
    <div className={styles.detailPage}>
      <div className={styles.detailHeading}>
        <div>
          <div className={styles.localBreadcrumb}>
            <Link href="/admin/koleksi/data-buku">Data Buku</Link>
            <span>/</span>
            <strong>{book.title}</strong>
          </div>
          <h1>Detail Buku</h1>
        </div>
        <Link data-button="back" data-button-size="md" href="/admin/koleksi/data-buku" className={styles.backButton}>
          <FiArrowLeft aria-hidden />
          Kembali
        </Link>
      </div>

      {error ? <div className={styles.inlineError} role="alert">{error}</div> : null}

      <section className={styles.detailHero}>
        <img
          className={styles.detailCover}
          src={safeCoverUrl(book.coverUrl)}
          alt={`Sampul ${book.title}`}
        />
        <div className={styles.heroInfo}>
          <div className={styles.heroBadges}>
            <span>Fisik</span>
            <span className={book.isActive ? styles.heroActive : styles.heroInactive}>
              {book.isActive ? "Aktif" : "Nonaktif"}
            </span>
          </div>
          <h2>{book.title}</h2>
          <p>
            {book.author} · {book.year}
          </p>
          <strong className={styles.codeBadge}>{book.code}</strong>
        </div>
        <div className={styles.heroActions}>
          <Link
            data-button="secondary"
            data-button-size="md"
            data-button-inverse
            href={`/admin/koleksi/data-buku/${book.id}/edit`}
            className={styles.yellowAction}
          >
            <FiEdit2 aria-hidden />
            Edit
          </Link>
          <button
            data-button={book.isActive ? "danger" : "success"}
            data-button-size="md"
            data-button-loading={changingStatus}
            type="button"
            className={styles.darkAction}
            onClick={() => {
              setError("");
              setStatusDialogOpen(true);
            }}
            disabled={changingStatus}
          >
            <FiPower aria-hidden />
            {changingStatus
              ? "Memproses..."
              : book.isActive
                ? "Nonaktifkan"
                : "Aktifkan"}
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
          <h3>Stok & Lokasi</h3>
          <StatCard className={styles.stockBox} label="STOK TERSEDIA" value={<>{book.availableCopies} <small>/ {book.totalCopies}</small></>} tone="success" icon={<FiCheckCircle />} detail={`${book.totalCopies - book.availableCopies} sedang direservasi, dipinjam, atau tidak tersedia`}>
            <div className={styles.progressTrack} aria-hidden="true">
              <span style={{ width: `${stockPercent}%` }} />
            </div>
          </StatCard>
          <dl className={styles.infoList}>
            <div><dt>LOKASI</dt><dd>{book.location || "—"}</dd></div>
            <div><dt>RAK</dt><dd>{book.shelf || "—"}</dd></div>
          </dl>
        </section>
      </div>

      <section className={styles.detailPanel}>
        <h3>Deskripsi</h3>
        <p className={styles.description}>{book.description}</p>
      </section>

      <section className={styles.detailPanel}>
        <h3>Transaksi Terkait</h3>
        {book.transactions.length ? (
          <div className={styles.transactionList}>
            {book.transactions.map((transaction) => (
              <article key={transaction.id} className={styles.transactionRow} data-record-card>
                <div>
                  <strong data-record-primary>{transaction.code}</strong>
                  <small>
                    {transaction.member.name} · {transaction.copyCode} · batas {adminDate(transaction.deadline)}
                  </small>
                </div>
                <span className={styles.transactionBadge} data-record-badge>
                  <FiCheckCircle aria-hidden />
                  {transaction.type === "PEMINJAMAN" ? "Pinjaman Aktif" : "Reservasi Aktif"}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>Tidak ada transaksi aktif untuk buku ini.</p>
        )}
      </section>
      <ConfirmDialog
        open={statusDialogOpen}
        title={book.isActive ? "Nonaktifkan Buku?" : "Aktifkan Buku?"}
        description={
          book.isActive
            ? `"${book.title}" akan dinonaktifkan dari katalog pengunjung.`
            : `"${book.title}" akan diaktifkan kembali di katalog.`
        }
        variant={book.isActive ? "danger" : "primary"}
        confirmLabel={book.isActive ? "Nonaktifkan" : "Aktifkan"}
        pending={changingStatus}
        error={error}
        onConfirm={toggleStatus}
        onCancel={() => {
          if (!changingStatus) setStatusDialogOpen(false);
        }}
      />
    </div>
  );
}
