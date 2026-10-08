/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";

import {
  formatTransactionDateTime,
  memberTypeLabel,
  transactionApiMessage,
  transactionId,
  type ReservationsResponse,
} from "./adminTransactions";
import styles from "./AdminTransactions.module.css";

type StatusFilter =
  | "ALL"
  | "MENUNGGU_PENGAMBILAN"
  | "KEDALUWARSA"
  | "DIBATALKAN"
  | "DIAMBIL";

type MemberFilter = "ALL" | "UMUM" | "MAHASISWA" | "PEGAWAI";

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

function statusLabel(status: StatusFilter) {
  switch (status) {
    case "MENUNGGU_PENGAMBILAN":
      return "Menunggu Pengambilan";
    case "KEDALUWARSA":
      return "Kedaluwarsa";
    case "DIBATALKAN":
      return "Dibatalkan";
    case "DIAMBIL":
      return "Sudah Diambil";
    default:
      return "Semua Status";
  }
}

export default function AdminReservationsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [memberType, setMemberType] = useState<MemberFilter>("ALL");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<ReservationsResponse>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
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
    void load();
  }, [load]);

  async function confirmPickup(
    id: number,
    memberName: string,
    bookTitle: string,
  ) {
    const approved = window.confirm(
      `Konfirmasi ${memberName} telah mengambil buku “${bookTitle}”? Masa pinjam 7 hari akan dimulai saat dikonfirmasi.`,
    );

    if (!approved) {
      return;
    }

    setProcessingId(id);
    setError("");

    try {
      const response = await fetch(
        `/api/members/admin/reservations/${id}/pickup`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error(
          await transactionApiMessage(
            response,
            "Pengambilan buku gagal dikonfirmasi.",
          ),
        );
      }

      setRevision((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Pengambilan buku gagal dikonfirmasi.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1>Reservasi</h1>
        <p>Pantau reservasi buku fisik dan proses pengambilan anggota.</p>
      </header>

      <section className={styles.statsFour} aria-label="Ringkasan reservasi">
        <article className={`${styles.statCard} ${styles.statNavy}`}>
          <span>MENUNGGU PENGAMBILAN</span>
          <strong>{result.stats.waiting}</strong>
          <small>reservasi aktif</small>
        </article>

        <article className={`${styles.statCard} ${styles.statOrange}`}>
          <span>HAMPIR KEDALUWARSA</span>
          <strong>{result.stats.almostExpired}</strong>
          <small>sisa waktu maksimal 2 jam</small>
        </article>

        <article className={`${styles.statCard} ${styles.statRed}`}>
          <span>KEDALUWARSA</span>
          <strong>{result.stats.expired}</strong>
          <small>reservasi tidak diambil</small>
        </article>

        <article className={`${styles.statCard} ${styles.statGreen}`}>
          <span>SUDAH DIAMBIL</span>
          <strong>{result.stats.pickedUp}</strong>
          <small>reservasi menjadi pinjaman</small>
        </article>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2>Daftar Reservasi Buku</h2>
          <p>Data reservasi diperbarui langsung dari transaksi anggota.</p>
        </header>

        <div className={`${styles.filterBar} ${styles.filterBarThree}`}>
          <label className={styles.searchBox}>
            <FiSearch aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari anggota, buku, kode buku, atau WhatsApp..."
              aria-label="Cari reservasi"
            />
          </label>

          <label className={styles.selectField}>
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="ALL">Semua Status</option>
              <option value="MENUNGGU_PENGAMBILAN">Menunggu Pengambilan</option>
              <option value="KEDALUWARSA">Kedaluwarsa</option>
              <option value="DIBATALKAN">Dibatalkan</option>
              <option value="DIAMBIL">Sudah Diambil</option>
            </select>
          </label>

          <label className={styles.selectField}>
            <span>Jenis Anggota</span>
            <select
              value={memberType}
              onChange={(event) => {
                setMemberType(event.target.value as MemberFilter);
                setPage(1);
              }}
            >
              <option value="ALL">Semua Jenis</option>
              <option value="UMUM">Masyarakat Umum</option>
              <option value="MAHASISWA">Mahasiswa</option>
              <option value="PEGAWAI">Pegawai Internal</option>
            </select>
          </label>
        </div>

        {error ? (
          <div className={styles.errorBox} role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Coba Lagi
            </button>
          </div>
        ) : null}

        <div className={styles.tableScroller}>
          <table className={`${styles.table} ${styles.tableWide}`}>
            <thead>
              <tr>
                <th>ID</th>
                <th>ANGGOTA</th>
                <th>BUKU</th>
                <th>DIAJUKAN</th>
                <th>BATAS PENGAMBILAN</th>
                <th>STATUS</th>
                <th>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.stateCell}>
                    Memuat data reservasi...
                  </td>
                </tr>
              ) : result.data.length ? (
                result.data.map((reservation) => (
                  <tr key={reservation.id}>
                    <td className={styles.transactionCode}>
                      {transactionId(reservation.id, "RSV")}
                    </td>

                    <td>
                      <div className={styles.memberCell}>
                        <strong>{reservation.member.name}</strong>
                        <small>
                          {memberTypeLabel(reservation.member.memberType)}
                        </small>
                      </div>
                    </td>

                    <td>
                      <div className={styles.bookCell}>
                        <img
                          src={
                            reservation.book.coverUrl ||
                            "/images/landing/book-placeholder-1.svg"
                          }
                          alt=""
                        />
                        <div>
                          <strong>{reservation.book.title}</strong>
                          <small>{reservation.book.code}</small>
                        </div>
                      </div>
                    </td>

                    <td>{formatTransactionDateTime(reservation.createdAt)}</td>

                    <td>{formatTransactionDateTime(reservation.expiresAt)}</td>

                    <td>
                      <span
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
                        {statusLabel(reservation.status)}
                      </span>
                    </td>

                    <td>
                      {reservation.status === "MENUNGGU_PENGAMBILAN" ? (
                        <button
                          type="button"
                          className={styles.primaryAction}
                          disabled={processingId === reservation.id}
                          onClick={() =>
                            void confirmPickup(
                              reservation.id,
                              reservation.member.name,
                              reservation.book.title,
                            )
                          }
                        >
                          {processingId === reservation.id
                            ? "Memproses..."
                            : "Konfirmasi Pengambilan"}
                        </button>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.stateCell}>
                    Tidak ada reservasi yang sesuai dengan pencarian atau
                    filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && result.meta.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Halaman reservasi">
            <button
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
