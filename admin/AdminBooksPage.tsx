/* eslint-disable @next/next/no-img-element */
"use client";

import { adminCoverUrl, adminBookTextError } from "./adminBooks";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { FiEdit2, FiEye, FiPlus, FiPower, FiSearch } from "react-icons/fi";
import { apiMessage, type AdminBooksResponse } from "./adminBooks";
import styles from "./AdminBooks.module.css";
import enhancements from "./AdminBooksEnhancements.module.css";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type AvailabilityFilter = "ALL" | "TERSEDIA" | "STOK_HABIS";

function readStatus(value: string | null): StatusFilter {
  return value === "ACTIVE" || value === "INACTIVE" ? value : "ALL";
}

function readAvailability(value: string | null): AvailabilityFilter {
  return value === "TERSEDIA" || value === "STOK_HABIS" ? value : "ALL";
}

function readStock(value: string | null) {
  return value && /^\d+$/.test(value) ? value : "";
}

const emptyData: AdminBooksResponse = {
  stats: { total: 0, active: 0, inactive: 0 },
  data: [],
  meta: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

export default function AdminBooksPage() {
  const params = useSearchParams();
  const initialSearch = params.get("search")?.trim() ?? "";
  const initialAvailability = readAvailability(params.get("availability"));
  const initialStockMin = readStock(params.get("stockMin"));
  const initialStockMax = readStock(params.get("stockMax"));

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<StatusFilter>(readStatus(params.get("status")));
  const [availabilityInput, setAvailabilityInput] =
    useState<AvailabilityFilter>(initialAvailability);
  const [availability, setAvailability] =
    useState<AvailabilityFilter>(initialAvailability);
  const [stockMinInput, setStockMinInput] = useState(initialStockMin);
  const [stockMaxInput, setStockMaxInput] = useState(initialStockMax);
  const [stockMin, setStockMin] = useState(initialStockMin);
  const [stockMax, setStockMax] = useState(initialStockMax);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminBooksResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changingId, setChangingId] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);

  const load = useCallback(async () => {
    void revision;
    const textError = adminBookTextError({ search });
    if (textError) {
      setError(textError);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");

    const query = new URLSearchParams({
      status,
      availability,
      page: String(page),
      limit: "20",
    });
    if (search) query.set("search", search);
    if (stockMin) query.set("stockMin", stockMin);
    if (stockMax) query.set("stockMax", stockMax);

    try {
      const response = await fetch(`/api/admin/books?${query}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(await apiMessage(response, "Data buku belum dapat dimuat."));
      }
      const payload = (await response.json()) as AdminBooksResponse;
      if (page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }
      setResult(payload);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Data buku belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [availability, page, search, status, stockMax, stockMin, revision]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Existing fetch lifecycle starts the loading state before requesting data.
    void load();
  }, [load]);

  useEffect(() => {
    const nextSearch = params.get("search")?.trim() ?? "";
    const nextStatus = readStatus(params.get("status"));
    const nextAvailability = readAvailability(params.get("availability"));
    const nextStockMin = readStock(params.get("stockMin"));
    const nextStockMax = readStock(params.get("stockMax"));

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize controls with dashboard deep-link filters.
    setSearchInput(nextSearch);
    setSearch(nextSearch);
    setStatus(nextStatus);
    setAvailabilityInput(nextAvailability);
    setAvailability(nextAvailability);
    setStockMinInput(nextStockMin);
    setStockMaxInput(nextStockMax);
    setStockMin(nextStockMin);
    setStockMax(nextStockMax);
    setPage(1);
  }, [params]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const textError = adminBookTextError({ search: searchInput });
    if (textError) {
      setError(textError);
      return;
    }
    setSearch(searchInput.trim());
    setPage(1);
  }

  function applyBookFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      (stockMinInput && !/^\d+$/.test(stockMinInput)) ||
      (stockMaxInput && !/^\d+$/.test(stockMaxInput))
    ) {
      setError("Rentang stok harus berupa angka 0 atau lebih.");
      return;
    }

    if (
      stockMinInput &&
      stockMaxInput &&
      Number(stockMinInput) > Number(stockMaxInput)
    ) {
      setError("Stok minimum tidak boleh lebih besar dari stok maksimum.");
      return;
    }

    setError("");
    setAvailability(availabilityInput);
    setStockMin(stockMinInput);
    setStockMax(stockMaxInput);
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
      const response = await fetch(`/api/admin/books/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      if (!response.ok) {
        throw new Error(await apiMessage(response, "Status buku gagal diubah."));
      }
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Status buku gagal diubah.",
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
      <section className={styles.stats} aria-label="Ringkasan data buku">
        <article className={`${styles.statCard} ${styles.statNavy}`}>
          <span>TOTAL BUKU</span>
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
            placeholder="Cari judul, penulis, atau kode buku..."
            aria-label="Cari data buku"
          />
        </form>
        <Link data-button="primary" data-button-size="md" href="/admin/koleksi/data-buku/tambah" className={styles.addButton}>
          <FiPlus aria-hidden />
          Tambah Buku
        </Link>
      </section>

      <div className={styles.filters} role="group" aria-label="Filter status buku">
        {filters.map((filter) => (
          <button
            data-button="secondary"
            data-button-size="md"
            data-button-active={status === filter.value}
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

      <form className={enhancements.filterPanel} onSubmit={applyBookFilters}>
        <label className={enhancements.filterField}>
          <span>Ketersediaan</span>
          <select
            value={availabilityInput}
            onChange={(event) =>
              setAvailabilityInput(event.target.value as AvailabilityFilter)
            }
          >
            <option value="ALL">Semua</option>
            <option value="TERSEDIA">Tersedia</option>
            <option value="STOK_HABIS">Stok Habis</option>
          </select>
        </label>

        <div className={enhancements.stockGroup}>
          <span>Rentang Stok Tersedia</span>
          <div className={enhancements.stockRange}>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={stockMinInput}
              onChange={(event) => setStockMinInput(event.target.value)}
              placeholder="Minimum"
              aria-label="Stok minimum"
            />
            <span className={enhancements.rangeSeparator}>–</span>
            <input
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={stockMaxInput}
              onChange={(event) => setStockMaxInput(event.target.value)}
              placeholder="Maksimum"
              aria-label="Stok maksimum"
            />
          </div>
        </div>

        <button data-button="primary" data-button-size="md" type="submit" className={enhancements.applyButton}>
          Terapkan Filter
        </button>
      </form>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
          <button data-button="secondary" data-button-size="md" type="button" onClick={() => setRevision((value) => value + 1)}>
            Coba Lagi
          </button>
        </div>
      ) : null}

      <section className={styles.tableCard} aria-busy={loading}>
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>BUKU</th>
                <th>KODE</th>
                <th>TAHUN</th>
                <th>STOK TERSEDIA</th>
                <th>KETERSEDIAAN</th>
                <th>STATUS</th>
                <th>AKSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.stateCell}>
                    Memuat data buku...
                  </td>
                </tr>
              ) : result.data.length ? (
                result.data.map((book) => (
                  <tr key={book.id}>
                    <td>
                      <div className={styles.bookCell}>
                        <img
                          src={adminCoverUrl(book.coverUrl)}
                          alt={`Sampul ${book.title}`}
                        />
                        <div>
                          <strong>{book.title}</strong>
                          <small>{book.author}</small>
                        </div>
                      </div>
                    </td>
                    <td className={styles.codeCell}>{book.code}</td>
                    <td>{book.year}</td>
                    <td>
                      <strong>{book.availableCopies}</strong> / {book.totalCopies}
                    </td>
                    <td>
                      <span
                        className={`${styles.pill} ${
                          book.availableCopies > 0
                            ? styles.available
                            : styles.stockOut
                        }`}
                      >
                        {book.availableCopies > 0 ? "Tersedia" : "Stok Habis"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.pill} ${
                          book.isActive ? styles.active : styles.inactive
                        }`}
                      >
                        {book.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link
                          data-button="secondary"
                          data-button-size="sm"
                          data-button-shape="square"
                          href={`/admin/koleksi/data-buku/${book.id}`}
                          className={styles.iconAction}
                          aria-label={`Lihat detail ${book.title}`}
                          title="Lihat detail"
                        >
                          <FiEye />
                        </Link>
                        <Link
                          data-button="warning"
                          data-button-size="sm"
                          data-button-shape="square"
                          href={`/admin/koleksi/data-buku/${book.id}/edit`}
                          className={styles.iconAction}
                          aria-label={`Edit ${book.title}`}
                          title="Edit buku"
                        >
                          <FiEdit2 />
                        </Link>
                        <button
                          data-button={book.isActive ? "danger" : "success"}
                          data-button-size="sm"
                          data-button-shape="square"
                          data-button-loading={changingId === book.id}
                          type="button"
                          className={`${styles.iconAction} ${
                            book.isActive ? styles.powerOff : styles.powerOn
                          }`}
                          aria-label={
                            book.isActive
                              ? `Nonaktifkan ${book.title}`
                              : `Aktifkan ${book.title}`
                          }
                          title={book.isActive ? "Nonaktifkan" : "Aktifkan"}
                          disabled={changingId === book.id}
                          onClick={() =>
                            void toggleStatus(book.id, book.isActive, book.title)
                          }
                        >
                          <FiPower />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.stateCell}>
                    Tidak ada buku yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && result.meta.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Halaman data buku">
            <button
              data-button="secondary"
              data-button-size="sm"
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              Sebelumnya
            </button>
            <span>
              Halaman {result.meta.page} dari {result.meta.totalPages}
            </span>
            <button
              data-button="secondary"
              data-button-size="sm"
              type="button"
              disabled={page >= result.meta.totalPages}
              onClick={() =>
                setPage((value) => Math.min(result.meta.totalPages, value + 1))
              }
            >
              Berikutnya
            </button>
          </nav>
        ) : null}
      </section>
    </div>
  );
}
