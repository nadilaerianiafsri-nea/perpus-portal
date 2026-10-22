/* eslint-disable @next/next/no-img-element */
"use client";

import AppSelect from "@/components/AppSelect";

import AdminStatCard from "./AdminStatCard";
import { FiClock as CardClock, FiAlertTriangle as CardAlertTriangle, FiXCircle as CardXCircle, FiCheckCircle as CardCheckCircle } from "react-icons/fi";

import Link from "next/link";
import { safeCoverUrl } from "../shared/displayUrls.cjs";
import { plainTextMessage } from "../members/inputSecurity";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiSearch, FiDownload } from "react-icons/fi";

import {
  formatTransactionDateTime,
  memberTypeLabel,
  transactionApiMessage,
  type ReservationsResponse,
} from "./adminTransactions";
import styles from "./AdminTransactions.module.css";
import ui from "./AdminReservationTools.module.css";
import { reservationStatusLabel, reservationsCsv, sortReservations, type ReservationSort } from "./adminReservations";
import { jakartaDateInput } from "@/shared/period";

type StatusFilter =
  | "ALL"
  | "MENUNGGU_PENGAMBILAN"
  | "KEDALUWARSA"
  | "DIBATALKAN"
  | "DIAMBIL";

type MemberFilter = "ALL" | "UMUM" | "MAHASISWA" | "PEGAWAI";

function readStatus(value: string | null): StatusFilter {
  return value === "MENUNGGU_PENGAMBILAN" ||
    value === "KEDALUWARSA" ||
    value === "DIBATALKAN" ||
    value === "DIAMBIL"
    ? value
    : "ALL";
}

const emptyResult: ReservationsResponse = {
  stats: {
    waiting: 0,
    almostExpired: 0,
    expired: 0,
    pickedUp: 0,
  },
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

export default function AdminReservationsPage() {
  const params = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const searchError = plainTextMessage(searchInput, 100);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>(readStatus(params.get("status")));
  const [memberType, setMemberType] = useState<MemberFilter>("ALL");
  const [page, setPage] = useState(1);
  const [sortOrder, setSortOrder] = useState<ReservationSort>("newest");

  const [result, setResult] = useState<ReservationsResponse>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (searchError) return;
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput, searchError]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize dashboard deep-link filter with existing controls.
    setStatus(readStatus(params.get("status")));
    setPage(1);
  }, [params]);

  const load = useCallback(async () => {
    void revision;

    setLoading(true);
    setError("");

    const query = new URLSearchParams({
      status,
      memberType,
      page: String(page),
      limit: "20",
    });

    if (search) {
      query.set("search", search);
    }

    try {
      const response = await fetch(
        `/api/members/admin/transactions/reservations?${query}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          await transactionApiMessage(
            response,
            "Data reservasi belum dapat dimuat.",
          ),
        );
      }

      const payload = (await response.json()) as ReservationsResponse;

      if (page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }

      setResult(payload);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Data reservasi belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [memberType, page, revision, search, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Existing fetch lifecycle starts the loading state before requesting data.
    void load();
  }, [load]);

  const orderedRows = sortReservations(result.data, sortOrder);
  const exportDisabled = loading || Boolean(error) || Boolean(searchError) || searchInput.trim() !== search || !orderedRows.length;

  function exportReservations() {
    if (exportDisabled) return;
    const url = URL.createObjectURL(new Blob([reservationsCsv(orderedRows)], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `reservasi-halaman-${result.meta.page}-${jakartaDateInput()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1 data-page-title>Reservasi</h1>
      </header>

      <section className={styles.statsFour} aria-label="Ringkasan reservasi">
        <AdminStatCard label="MENUNGGU PENGAMBILAN" value={result.stats.waiting} tone="info" icon={<CardClock />}
          detail="reservasi aktif" />

        <AdminStatCard label="HAMPIR KEDALUWARSA" value={result.stats.almostExpired} tone="warning" icon={<CardAlertTriangle />}
          detail="sisa waktu maksimal 2 jam" />

        <AdminStatCard label="KEDALUWARSA" value={result.stats.expired} tone="danger" icon={<CardXCircle />}
          detail="reservasi tidak diambil" />

        <AdminStatCard label="SUDAH DIAMBIL" value={result.stats.pickedUp} tone="success" icon={<CardCheckCircle />}
          detail="reservasi menjadi pinjaman" />
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2>Daftar Reservasi Buku</h2>
          <p>Data reservasi diperbarui langsung dari transaksi anggota.</p>
        </header>

        <div className={ui.tools}>
          <label className={styles.searchBox}>
            <FiSearch aria-hidden />
            <input
              type="search"
              maxLength={100}
              aria-invalid={Boolean(searchError)}
              aria-describedby={searchError ? "search-input-error" : undefined}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari anggota, buku, kode buku, atau WhatsApp..."
              aria-label="Cari reservasi"
            />
          </label>
          <button
            data-button="secondary"
            data-button-size="md"
            type="button"
            className={ui.exportButton}
            disabled={exportDisabled}
            onClick={exportReservations}
            aria-label="Ekspor CSV halaman ini"
          >
            <FiDownload aria-hidden /> Ekspor CSV
          </button>
          {searchError && <small className={styles.searchError} id="search-input-error" role="alert">{searchError}</small>}

          <div className={ui.filters}>
            <label className={styles.selectField}>
              <AppSelect
                aria-label="Filter status reservasi"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as StatusFilter);
                  setPage(1);
                }}
              >
                <option value="ALL">Semua Status Reservasi</option>
                <option value="MENUNGGU_PENGAMBILAN">Menunggu Pengambilan</option>
                <option value="KEDALUWARSA">Kedaluwarsa</option>
                <option value="DIBATALKAN">Dibatalkan</option>
                <option value="DIAMBIL">Sudah Diambil</option>
              </AppSelect>
            </label>

            <label className={styles.selectField}>
              <AppSelect
                aria-label="Filter jenis anggota reservasi"
                value={memberType}
                onChange={(event) => {
                  setMemberType(event.target.value as MemberFilter);
                  setPage(1);
                }}
              >
                <option value="ALL">Semua Jenis Anggota</option>
                <option value="UMUM">Masyarakat Umum</option>
                <option value="MAHASISWA">Mahasiswa</option>
                <option value="PEGAWAI">Pegawai Internal</option>
              </AppSelect>
            </label>
            <AppSelect aria-label="Urutan tanggal reservasi pada halaman ini" value={sortOrder} onChange={event => setSortOrder(event.target.value as ReservationSort)}>
              <option value="newest">Reservasi terbaru dulu</option>
              <option value="oldest">Reservasi terlama dulu</option>
            </AppSelect>
          </div>
        </div>
        <p className={ui.scopeNote}>Urutan tanggal dan ekspor mengikuti data pada halaman ini.</p>

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

        <div className={styles.tableScroller} data-record-scroll>
          <table data-record-list data-record-scroll className={`${styles.table} ${styles.tableWide} ${styles.transactionTable} ${styles.reservationsTable} ${ui.table}`}>
            <thead>
              <tr>
                <th scope="col">ANGGOTA</th>
                <th scope="col">BUKU</th>
                <th scope="col">DIAJUKAN</th>
                <th scope="col">BATAS PENGAMBILAN</th>
                <th scope="col">STATUS</th>
                <th scope="col" className={ui.processColumn}>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.stateCell}>
                    Memuat data reservasi...
                  </td>
                </tr>
              ) : result.data.length ? (
                orderedRows.map((reservation) => (
                  <tr key={reservation.id}>
                    <td>
                      <div className={styles.memberCell}>
                        <strong data-record-primary>{reservation.member.name}</strong>
                        <small>
                          {memberTypeLabel(reservation.member.memberType)}
                        </small>
                      </div>
                    </td>

                    <td>
                      <div className={styles.bookCell}>
                        <img
                          src={safeCoverUrl(reservation.book.coverUrl)}
                          alt=""
                        />
                        <div>
                          <strong data-record-primary>{reservation.book.title}</strong>
                          <small>{reservation.book.code}</small>
                        </div>
                      </div>
                    </td>

                    <td>{formatTransactionDateTime(reservation.createdAt)}</td>

                    <td>{formatTransactionDateTime(reservation.expiresAt)}</td>

                    <td>
                      <span data-record-badge
                        className={`${styles.pill} ${
                          reservation.status === "MENUNGGU_PENGAMBILAN"
                            ? styles.warningPill
                            : reservation.status === "DIAMBIL"
                              ? styles.activePill
                              : reservation.status === "KEDALUWARSA"
                                ? styles.dangerPill
                                : styles.mutedPill
                        }`}
                      >
                        {reservationStatusLabel(reservation.status)}
                      </span>
                    </td>

                    <td>
                      {reservation.status === "MENUNGGU_PENGAMBILAN" ? (
                        <Link data-button="primary" data-button-size="md" className={ui.processLink}
                          href={`/admin/transaksi/reservasi/${reservation.id}?anggota=${reservation.member.id}`}
                          aria-label={`Proses reservasi ${reservation.book.title} oleh ${reservation.member.name}`}>
                          Proses
                        </Link>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className={styles.stateCell}>
                    Tidak ada reservasi yang sesuai dengan pencarian atau
                    filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && result.meta.totalPages > 1 ? (
          <nav className={`${styles.pagination} ${styles.transactionPagination}`} aria-label="Halaman reservasi">
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
