/* eslint-disable @next/next/no-img-element */
"use client";

import AppSelect from "@/components/AppSelect";
import AdminStatCard from "./AdminStatCard";
import { FiMonitor as CardMonitor, FiCheckCircle as CardCheckCircle, FiArchive as CardArchive } from "react-icons/fi";

import { adminCoverUrl, adminBookTextError } from "./adminBooks";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
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
import fixes from "./AdminCollectionFixes.module.css";
import EBookYearFilter, { createEBookYearRange } from "./EBookYearFilter";

type StatusFilter = "ALL" | "ACTIVE" | "INACTIVE";
type SubjectFilter = "ALL" | string;

const SUBJECT_CATEGORIES = [
  "Hukum",
  "Perundang-undangan",
  "Novel",
  "Pendidikan",
  "Sejarah",
  "Agama",
  "Teknologi",
  "Sosial",
  "Ekonomi",
  "Politik",
  "Biografi",
  "Referensi",
] as const;

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
  const [subject, setSubject] = useState<SubjectFilter>("ALL");
  const [yearRange, setYearRange] = useState(() => createEBookYearRange("all"));
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<AdminEBooksResponse>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [changingId, setChangingId] = useState<number | null>(null);
  const [statusTarget, setStatusTarget] = useState<{
    id: number;
    current: boolean;
    title: string;
  } | null>(null);
  const [revision, setRevision] = useState(0);

  const load = useCallback(async () => {
    void revision;
    const textError = adminBookTextError({ search });
    if (textError) { setError(textError); setLoading(false); return; }
    setLoading(true);
    setError("");

    const query = new URLSearchParams({
      status,
      page: String(page),
      limit: "20",
    });
    if (search) query.set("search", search);
    if (subject !== "ALL") query.set("subject", subject);
    if (yearRange.from) query.set("yearMin", yearRange.from);
    if (yearRange.to) query.set("yearMax", yearRange.to);

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
  }, [page, search, status, subject, yearRange, revision]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Existing fetch lifecycle starts the loading state before requesting data.
    void load();
  }, [load]);

  useEffect(() => {
    const next = params.get("search")?.trim() ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Keep the existing search control synchronized with navigation query changes.
    setSearchInput(next);
    setSearch(next);
    setPage(1);
  }, [params]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const textError = adminBookTextError({ search: searchInput });
    if (textError) { setError(textError); return; }
    setSearch(searchInput.trim());
    setPage(1);
  }

  function requestStatus(id: number, current: boolean, title: string) {
    if (changingId !== null) return;
    setError("");
    setStatusTarget({ id, current, title });
  }

  async function toggleStatus() {
    if (!statusTarget || changingId !== null) return;
    const { id, current } = statusTarget;
    const next = !current;

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
      setStatusTarget(null);
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Status E-Book gagal diubah.",
      );
    } finally {
      setChangingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.stats} aria-label="Ringkasan E-Book">
        <AdminStatCard label="TOTAL E-BOOK" value={result.stats.total} tone="yellow" icon={<CardMonitor />}
           />
        <AdminStatCard label="AKTIF" value={result.stats.active} tone="success" icon={<CardCheckCircle />}
           />
        <AdminStatCard label="NONAKTIF" value={result.stats.inactive} tone="slate" icon={<CardArchive />}
           />
      </section>

      <section className={styles.toolbar}>
        <form className={`${styles.searchBox} ${fixes.searchBox}`} onSubmit={submitSearch}>
          <FiSearch aria-hidden />
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari judul, penulis, atau kode E-Book..."
            aria-label="Cari E-Book"
          />
        </form>
        <Link data-button="primary" data-button-size="md" href="/admin/koleksi/e-book/tambah" className={styles.addButton}>
          <FiPlus aria-hidden />
          Tambah E-Book
        </Link>
      </section>

      <div
        className={fixes.ebookFilterBar}
        role="group"
        aria-label="Filter katalog E-Book"
      >
        <div className={fixes.ebookFilterField}>
          <AppSelect
            aria-label="Filter status E-Book"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as StatusFilter);
              setPage(1);
            }}
          >
            <option value="ALL">Semua Status</option>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
          </AppSelect>
        </div>

        <div className={fixes.ebookFilterField}>
          <AppSelect
            aria-label="Filter subjek atau kategori E-Book"
            value={subject}
            onChange={(event) => {
              setSubject(event.target.value as SubjectFilter);
              setPage(1);
            }}
          >
            <option value="ALL">Semua Subjek / Kategori</option>
            {SUBJECT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </AppSelect>
        </div>

        <EBookYearFilter
          value={yearRange}
          disabled={loading}
          onChange={(next) => {
            setYearRange(next);
            setPage(1);
          }}
        />
      </div>

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
          <table className={`${styles.table} ${styles.ebookTable}`} data-record-list data-record-scroll>
            <thead>
              <tr>
                <th>E-BOOK</th>
                <th>MODE AKSES</th>
                <th>STATUS</th>
                <th data-record-actions="3">AKSI</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className={styles.stateCell}>Memuat data E-Book...</td>
                </tr>
              ) : result.data.length ? (
                result.data.map((book) => (
                  <tr key={book.id}>
                    <td>
                      <div className={styles.bookCell}>
                        <img src={adminCoverUrl(book.coverUrl)} alt={`Sampul ${book.title}`} />
                        <div>
                          <strong>{book.title}</strong>
                          <small>{book.author}</small>
                        </div>
                      </div>
                    </td>
                    <td><span className={styles.modePill} data-record-badge>{accessModeLabel(book.accessMode)}</span></td>
                    <td>
                      <span className={`${styles.pill} ${book.isActive ? styles.active : styles.inactive}`} data-record-badge>
                        {book.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions} data-record-action-group>
                        <Link data-row-action="neutral" data-button="secondary" data-button-size="sm" data-button-shape="square" href={`/admin/koleksi/e-book/${book.id}`} className={styles.iconAction} aria-label={`Lihat detail E-Book ${book.title}`} title="Lihat detail E-Book">
                          <FiEye aria-hidden="true" />
                        </Link>
                        <Link data-row-action="warning" data-button="warning" data-button-size="sm" data-button-shape="square" href={`/admin/koleksi/e-book/${book.id}/edit`} className={styles.iconAction} aria-label={`Edit E-Book ${book.title}`} title="Edit E-Book">
                          <FiEdit2 aria-hidden="true" />
                        </Link>
                        <button data-row-action={book.isActive ? "danger-soft" : "success"} aria-busy={changingId === book.id}
                          data-button={book.isActive ? "danger" : "success"}
                          data-button-size="sm"
                          data-button-shape="square"
                          data-button-loading={changingId === book.id}
                          type="button"
                          className={`${styles.iconAction} ${book.isActive ? styles.powerOff : styles.powerOn}`}
                          aria-label={book.isActive ? `Nonaktifkan E-Book ${book.title}` : `Aktifkan E-Book ${book.title}`}
                          title={book.isActive ? "Nonaktifkan E-Book" : "Aktifkan E-Book"}
                          disabled={changingId === book.id}
                          onClick={() => requestStatus(book.id, book.isActive, book.title)}
                        >
                          <FiPower aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className={styles.stateCell}>Tidak ada E-Book yang sesuai dengan pencarian atau filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && result.meta.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Halaman E-Book">
            <button data-button="secondary" data-button-size="sm" type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Sebelumnya</button>
            <span>Halaman {result.meta.page} dari {result.meta.totalPages}</span>
            <button data-button="secondary" data-button-size="sm" type="button" disabled={page >= result.meta.totalPages} onClick={() => setPage((value) => Math.min(result.meta.totalPages, value + 1))}>Berikutnya</button>
          </nav>
        ) : null}
      </section>
      <ConfirmDialog
        open={statusTarget !== null}
        title={statusTarget?.current ? "Nonaktifkan E-Book?" : "Aktifkan E-Book?"}
        description={
          statusTarget?.current
            ? `"${statusTarget.title}" akan dinonaktifkan dari katalog pengunjung.`
            : `"${statusTarget?.title ?? ""}" akan diaktifkan kembali di katalog.`
        }
        variant={statusTarget?.current ? "danger" : "primary"}
        confirmLabel={statusTarget?.current ? "Nonaktifkan" : "Aktifkan"}
        pending={changingId !== null}
        error={error}
        onConfirm={toggleStatus}
        onCancel={() => {
          if (changingId === null) setStatusTarget(null);
        }}
      />
    </div>
  );
}
