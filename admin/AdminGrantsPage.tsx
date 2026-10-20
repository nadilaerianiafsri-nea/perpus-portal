"use client";

import AdminStatCard from "./AdminStatCard";
import { FiGift as CardGift, FiClock as CardClock, FiCheckCircle as CardCheckCircle, FiLayers as CardLayers } from "react-icons/fi";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiSearch, FiEye, FiEdit2 } from "react-icons/fi";

import {
  adminGrantApiMessage,
  adminGrantTextError,
  adminGrantStatusLabels,
  formatAdminGrantDate,
  grantCode,
  type AdminGrantStatus,
  type AdminGrantsResponse,
} from "./adminGrants";
import styles from "./AdminGrants.module.css";

const emptyResult: AdminGrantsResponse = {
  data: [],
  stats: {
    totalBooks: 0,
    pendingBooks: 0,
    cataloguedBooks: 0,
    totalReceipts: 0,
  },
  years: [],
  meta: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  },
};

export default function AdminGrantsPage() {
  const [searchInput, setSearchInput] = useState("");

  const [search, setSearch] = useState("");

  const [status, setStatus] = useState<"" | AdminGrantStatus>("");

  const [year, setYear] = useState("");

  const [page, setPage] = useState(1);

  const [result, setResult] = useState<AdminGrantsResponse>(emptyResult);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const textError = adminGrantTextError({ search: searchInput });
      if (textError) { setError(textError); return; }
      setSearch(searchInput.trim());

      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const load = useCallback(async () => {
    void revision;

    setLoading(true);
    setError("");

    const query = new URLSearchParams({
      page: String(page),
      limit: "10",
    });

    if (search) {
      query.set("search", search);
    }

    if (status) {
      query.set("status", status);
    }

    if (year) {
      query.set("year", year);
    }

    try {
      const response = await fetch(`/api/admin/grants?${query.toString()}`, {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(
          await adminGrantApiMessage(
            response,
            "Data hibah belum dapat dimuat.",
          ),
        );
      }

      const payload = (await response.json()) as AdminGrantsResponse;

      if (page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }

      setResult(payload);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Data hibah belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, revision, search, status, year]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Existing fetch lifecycle starts the loading state before requesting data.
    void load();
  }, [load]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <div>
          <h1>Hibah Buku</h1>

          <p>
            Catat buku yang telah diterima dari individu, komunitas, organisasi,
            maupun instansi.
          </p>
        </div>

        <Link data-button="primary" data-button-size="md" href="/admin/hibah-buku/tambah" className={styles.addButton}>
          + Tambah Data Hibah
        </Link>
      </header>

      <section className={styles.stats} aria-label="Statistik hibah buku">
        <AdminStatCard label="TOTAL BUKU HIBAH" value={result.stats.totalBooks.toLocaleString("id-ID")} tone="dark" icon={<CardGift />}
          detail="berdasarkan filter aktif" />

        <AdminStatCard label="BELUM DIKATALOGKAN" value={result.stats.pendingBooks.toLocaleString("id-ID")} tone="warning" icon={<CardClock />}
          detail="buku belum selesai katalog" />

        <AdminStatCard label="SUDAH DIKATALOGKAN" value={result.stats.cataloguedBooks.toLocaleString("id-ID")} tone="success" icon={<CardCheckCircle />}
          detail="buku selesai katalog" />

        <AdminStatCard label="TOTAL PENERIMAAN" value={result.stats.totalReceipts.toLocaleString("id-ID")} tone="primary" icon={<CardLayers />}
          detail="data penerimaan hibah" />
      </section>

      <section className={styles.filterCard}>
        <label className={styles.searchBox}>
          <FiSearch aria-hidden />

          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Cari judul buku atau pemberi hibah..."
            aria-label="Cari hibah buku"
          />
        </label>

        <label className={styles.selectField}>
          <span>Status Katalogisasi</span>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as "" | AdminGrantStatus);

              setPage(1);
            }}
          >
            <option value="">Semua Status</option>

            <option value="BELUM_DIKATALOGKAN">Belum Dikatalogkan</option>

            <option value="SUDAH_DIKATALOGKAN">Sudah Dikatalogkan</option>
          </select>
        </label>

        <label className={styles.selectField}>
          <span>Tahun Penerimaan</span>

          <select
            value={year}
            onChange={(event) => {
              setYear(event.target.value);

              setPage(1);
            }}
          >
            <option value="">Semua Tahun</option>

            {result.years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </section>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>

          <button
            data-button="secondary"
            data-button-size="md"
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      <section className={styles.tableCard} aria-busy={loading}>
        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>DAFTAR BUKU</th>
                <th>JUMLAH JUDUL</th>
                <th>TOTAL BUKU</th>
                <th>PEMBERI</th>
                <th>TANGGAL</th>
                <th>STATUS</th>
                <th>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className={styles.stateCell}>
                    Memuat data hibah...
                  </td>
                </tr>
              ) : result.data.length ? (
                result.data.map((grant) => (
                  <tr key={grant.id}>
                    <td className={styles.codeCell}>{grantCode(grant.id)}</td>

                    <td>
                      <div className={styles.titleCell}>
                        <strong>{grant.items[0]?.title ?? "-"}</strong>

                        {grant.items.length > 1 ? (
                          <small>+{grant.items.length - 1} judul lainnya</small>
                        ) : null}
                      </div>
                    </td>

                    <td className={styles.numberCell}>{grant.totalTitles}</td>

                    <td className={styles.numberCell}>
                      {grant.totalBooks.toLocaleString("id-ID")}
                    </td>

                    <td>{grant.donorName}</td>

                    <td>{formatAdminGrantDate(grant.receivedAt)}</td>

                    <td>
                      <span
                        className={`${styles.statusPill} ${
                          grant.status === "SUDAH_DIKATALOGKAN"
                            ? styles.catalogued
                            : styles.pending
                        }`}
                      >
                        {adminGrantStatusLabels[grant.status]}
                      </span>
                    </td>

                    <td>
                      <div className={styles.actions}>
                        <Link data-button-shape="square" title="Lihat detail hibah" aria-label={`Lihat detail hibah ${grantCode(grant.id)} dari ${grant.donorName}`} data-row-action="neutral"
                          data-button="secondary"
                          data-button-size="sm"
                          href={`/admin/hibah-buku/${grant.id}`}
                          className={styles.actionButton}
                        >
                          <FiEye aria-hidden="true" />
                        </Link>

                        <Link data-button-shape="square" title="Edit hibah" aria-label={`Edit hibah ${grantCode(grant.id)} dari ${grant.donorName}`} data-row-action="warning"
                          data-button="warning"
                          data-button-size="sm"
                          href={`/admin/hibah-buku/${grant.id}/edit`}
                          className={styles.actionButton}
                        >
                          <FiEdit2 aria-hidden="true" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={styles.stateCell}>
                    Tidak ada data hibah yang sesuai dengan pencarian atau
                    filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.mobileList}>
          {!loading &&
            result.data.map((grant) => (
              <article key={grant.id} className={styles.mobileCard}>
                <div className={styles.mobileCardHeader}>
                  <div>
                    <strong>{grantCode(grant.id)}</strong>

                    <small>{grant.donorName}</small>
                  </div>

                  <span
                    className={`${styles.statusPill} ${
                      grant.status === "SUDAH_DIKATALOGKAN"
                        ? styles.catalogued
                        : styles.pending
                    }`}
                  >
                    {adminGrantStatusLabels[grant.status]}
                  </span>
                </div>

                <div className={styles.mobileInfo}>
                  <div>
                    <span>Judul</span>
                    <strong>{grant.totalTitles}</strong>
                  </div>

                  <div>
                    <span>Total Buku</span>
                    <strong>{grant.totalBooks.toLocaleString("id-ID")}</strong>
                  </div>

                  <div>
                    <span>Penerimaan</span>
                    <strong>{formatAdminGrantDate(grant.receivedAt)}</strong>
                  </div>

                  <div>
                    <span>Buku Pertama</span>
                    <strong>{grant.items[0]?.title ?? "-"}</strong>
                  </div>
                </div>

                <div className={styles.mobileActions}>
                  <Link data-button-shape="square" title="Lihat detail hibah" aria-label={`Lihat detail hibah ${grantCode(grant.id)} dari ${grant.donorName}`} data-row-action="neutral"
                    data-button="secondary"
                    data-button-size="sm"
                    href={`/admin/hibah-buku/${grant.id}`}
                    className={styles.actionButton}
                  >
                    <FiEye aria-hidden="true" />
                  </Link>

                  <Link data-button-shape="square" title="Edit hibah" aria-label={`Edit hibah ${grantCode(grant.id)} dari ${grant.donorName}`} data-row-action="warning"
                    data-button="warning"
                    data-button-size="sm"
                    href={`/admin/hibah-buku/${grant.id}/edit`}
                    className={styles.actionButton}
                  >
                    <FiEdit2 aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
        </div>

        {!loading && result.meta.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Halaman data hibah">
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
