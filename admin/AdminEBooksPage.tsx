/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { FiEdit2, FiEye, FiPlus, FiPower, FiSearch } from "react-icons/fi";
import {
  accessModeLabel,
  ebookApiMessage,
  type AdminEBooksResponse,
} from "./adminEBooks";
import styles from "./AdminBooks.module.css";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

const emptyData: AdminEBooksResponse = {
  stats: { total: 0, active: 0, inactive: 0 },
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

export default function AdminEBooksPage() {
  const params = useSearchParams();
  const initialSearch = params.get("search")?.trim() ?? "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminEBooksResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changingId, setChangingId] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);

  const load = useCallback(async () => {
    void revision;
    setLoading(true);
    setError("");

    const query = new URLSearchParams({
      status,
      page: String(page),
      limit: "20",
    });
    if (search) query.set("search", search);

    try {
      const response = await fetch(`/api/admin/ebooks?${query}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await ebookApiMessage(response, "Data E-Book belum dapat dimuat."));
      }
      const payload = (await response.json()) as AdminEBooksResponse;
      if (page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }
      setResult(payload);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Data E-Book belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, status, revision]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const next = params.get("search")?.trim() ?? "";
    setSearchInput(next);
    setSearch(next);
    setPage(1);
  }, [params]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  async function toggleStatus(id: number, current: boolean, title: string) {
    const next = !current;
    const approved = window.confirm(
      next
        ? `Aktifkan kembali “${title}” di katalog?`
        : `Nonaktifkan “${title}” dari katalog pengunjung?`,
    );
    if (!approved) return;

    setChangingId(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/ebooks/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!response.ok) {
        throw new Error(await ebookApiMessage(response, "Status E-Book gagal diubah."));
      }
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Status E-Book gagal diubah.",
      );
    } finally {
      setChangingId(null);
    }
  }

  const filters: Array<{ value: StatusFilter; label: string }> = [
    { value: "ALL", label: "Semua" },
    { value: "ACTIVE", label: "Aktif" },
    { value: "INACTIVE", label: "Nonaktif" },
  ];

  return (
    <div className={styles.page}>
      <section className={styles.stats} aria-label="Ringkasan E-Book">
        <article className={`${styles.statCard} ${styles.statNavy}`}>
          <span>TOTAL E-BOOK</span>
          <strong>{result.stats.total}</strong>
        </article>
        <article className={`${styles.statCard} ${styles.statGreen}`}>
          <span>AKTIF</span>
          <strong>{result.stats.active}</strong>
        </article>
        <article className={`${styles.statCard} ${styles.statMuted}`}>
          <span>NONAKTIF</span>
          <strong>{result.stats.inactive}</strong>
        </article>
      </section>

      <section className={styles.toolbar}>
        <form className={styles.searchBox} onSubmit={submitSearch}>
          <FiSearch aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari judul, penulis, atau kode E-Book..."
            aria-label="Cari E-Book"
          />
        </form>
        <Link href="/admin/koleksi/e-book/tambah" className={styles.addButton}>
          <FiPlus aria-hidden />
          Tambah E-Book
        </Link>
      </section>

      <div className={styles.filters} role="group" aria-label="Filter status E-Book">
        {filters.map((filter) => (
          <button
            key={filter.value}
            type="button"
            className={status === filter.value ? styles.filterActive : ""}
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setRevision((value) => value + 1)}>
            Coba Lagi
          </button>
        </div>
      ) : null}

      <section className={styles.tableCard} aria-busy={loading}>
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>E-BOOK</th>
                <th>KODE</th>
                <th>TAHUN</th>
                <th>MODE AKSES</th>
                <th>STATUS</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.stateCell}>Memuat data E-Book...</td>
                </tr>
              ) : result.data.length ? (
                result.data.map((book) => (
                  <tr key={book.id}>
                    <td>
                      <div className={styles.bookCell}>
                        <img src={book.coverUrl || "/images/landing/book-placeholder-1.svg"} alt={`Sampul ${book.title}`} />
                        <div>
                          <strong>{book.title}</strong>
                          <small>{book.author}</small>
                        </div>
                      </div>
                    </td>
                    <td className={styles.codeCell}>{book.code}</td>
                    <td>{book.year}</td>
                    <td><span className={styles.modePill}>{accessModeLabel(book.accessMode)}</span></td>
                    <td>
                      <span className={`${styles.pill} ${book.isActive ? styles.active : styles.inactive}`}>
                        {book.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/admin/koleksi/e-book/${book.id}`} className={styles.iconAction} aria-label={`Lihat detail ${book.title}`} title="Lihat detail">
                          <FiEye />
                        </Link>
                        <Link href={`/admin/koleksi/e-book/${book.id}/edit`} className={styles.iconAction} aria-label={`Edit ${book.title}`} title="Edit E-Book">
                          <FiEdit2 />
                        </Link>
                        <button
                          type="button"
                          className={`${styles.iconAction} ${book.isActive ? styles.powerOff : styles.powerOn}`}
                          aria-label={book.isActive ? `Nonaktifkan ${book.title}` : `Aktifkan ${book.title}`}
                          title={book.isActive ? "Nonaktifkan" : "Aktifkan"}
                          disabled={changingId === book.id}
                          onClick={() => void toggleStatus(book.id, book.isActive, book.title)}
                        >
                          <FiPower />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={styles.stateCell}>Tidak ada E-Book yang sesuai dengan pencarian atau filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && result.meta.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Halaman E-Book">
            <button type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Sebelumnya</button>
            <span>Halaman {result.meta.page} dari {result.meta.totalPages}</span>
            <button type="button" disabled={page >= result.meta.totalPages} onClick={() => setPage((value) => Math.min(result.meta.totalPages, value + 1))}>Berikutnya</button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
