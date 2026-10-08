/* eslint-disable @next/next/no-img-element */
"use client";

import { useCallback, useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";

import {
  formatTransactionDate,
  memberTypeLabel,
  physicalLoanStatus,
  transactionApiMessage,
  transactionId,
  type ReturnsResponse,
} from "./adminTransactions";
import styles from "./AdminTransactions.module.css";

type StatusFilter = "ALL" | "DUE_TODAY" | "OVERDUE";

type MemberFilter = "ALL" | "UMUM" | "MAHASISWA" | "PEGAWAI";

const emptyResult: ReturnsResponse = {
  stats: {
    active: 0,
    dueToday: 0,
    overdue: 0,
    returnedToday: 0,
  },
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

export default function AdminReturnsPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [memberType, setMemberType] = useState<MemberFilter>("ALL");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<ReturnsResponse>(emptyResult);
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
        `/api/members/admin/transactions/returns?${query}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          await transactionApiMessage(
            response,
            "Data pengembalian belum dapat dimuat.",
          ),
        );
      }

      const payload = (await response.json()) as ReturnsResponse;

      if (page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }

      setResult(payload);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Data pengembalian belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [memberType, page, revision, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function finishLoan(
    id: number,
    mode: "return" | "lost",
    memberName: string,
    bookTitle: string,
  ) {
    const approved = window.confirm(
      mode === "return"
        ? `Konfirmasi buku “${bookTitle}” dari ${memberName} sudah dikembalikan?`
        : `Tandai buku “${bookTitle}” yang dipinjam ${memberName} sebagai hilang?`,
    );

    if (!approved) {
      return;
    }

    setProcessingId(id);
    setError("");

    try {
      const response = await fetch(`/api/members/admin/loans/${id}/${mode}`, {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(
          await transactionApiMessage(
            response,
            mode === "return"
              ? "Pengembalian gagal dikonfirmasi."
              : "Buku gagal ditandai hilang.",
          ),
        );
      }

      setRevision((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Status pinjaman gagal diubah.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1>Pengembalian</h1>
        <p>
          Konfirmasi pengembalian buku fisik atau arahkan kasus buku hilang
          untuk tindak lanjut.
        </p>
      </header>

      <section className={styles.statsFour} aria-label="Ringkasan pengembalian">
        <article className={`${styles.statCard} ${styles.statNavy}`}>
          <span>PINJAMAN AKTIF</span>
          <strong>{result.stats.active}</strong>
          <small>menunggu pengembalian</small>
        </article>

        <article className={`${styles.statCard} ${styles.statOrange}`}>
          <span>JATUH TEMPO HARI INI</span>
          <strong>{result.stats.dueToday}</strong>
          <small>perlu perhatian</small>
        </article>

        <article className={`${styles.statCard} ${styles.statRed}`}>
          <span>TERLAMBAT</span>
          <strong>{result.stats.overdue}</strong>
          <small>melewati jatuh tempo</small>
        </article>

        <article className={`${styles.statCard} ${styles.statGreen}`}>
          <span>DIKEMBALIKAN HARI INI</span>
          <strong>{result.stats.returnedToday}</strong>
          <small>pengembalian selesai</small>
        </article>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2>Daftar Buku untuk Pengembalian</h2>
        </header>

        <div className={`${styles.filterBar} ${styles.filterBarThree}`}>
          <label className={styles.searchBox}>
            <FiSearch aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari anggota, judul, kode buku, atau transaksi..."
              aria-label="Cari pengembalian"
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
              <option value="ALL">Semua Pinjaman Aktif</option>
              <option value="DUE_TODAY">Jatuh Tempo Hari Ini</option>
              <option value="OVERDUE">Terlambat</option>
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
                <th>DIPINJAM</th>
                <th>JATUH TEMPO</th>
                <th>PERPANJANGAN</th>
                <th>STATUS</th>
                <th>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className={styles.stateCell}>
                    Memuat data pengembalian...
                  </td>
                </tr>
              ) : result.data.length ? (
                result.data.map((loan) => {
                  const loanStatus = physicalLoanStatus(loan.dueAt);

                  return (
                    <tr key={loan.id}>
                      <td className={styles.transactionCode}>
                        {transactionId(loan.id)}
                      </td>

                      <td>
                        <div className={styles.memberCell}>
                          <strong>{loan.member.name}</strong>
                          <small>
                            {memberTypeLabel(loan.member.memberType)}
                          </small>
                        </div>
                      </td>

                      <td>
                        <div className={styles.bookCell}>
                          <img
                            src={
                              loan.book.coverUrl ||
                              "/images/landing/book-placeholder-1.svg"
                            }
                            alt=""
                          />
                          <div>
                            <strong>{loan.book.title}</strong>
                            <small>{loan.book.code}</small>
                          </div>
                        </div>
                      </td>

                      <td>{formatTransactionDate(loan.borrowedAt)}</td>

                      <td>{formatTransactionDate(loan.dueAt)}</td>

                      <td>{loan.extensionCount}×</td>

                      <td>
                        <span
                          className={`${styles.pill} ${
                            loanStatus === "TERLAMBAT"
                              ? styles.dangerPill
                              : loanStatus === "JATUH_TEMPO"
                                ? styles.warningPill
                                : styles.activePill
                          }`}
                        >
                          {loanStatus === "TERLAMBAT"
                            ? "Terlambat"
                            : loanStatus === "JATUH_TEMPO"
                              ? "Jatuh Tempo"
                              : "Pinjaman Aktif"}
                        </span>
                      </td>

                      <td>
                        <div className={styles.actionGroup}>
                          <button
                            type="button"
                            className={styles.primaryAction}
                            disabled={processingId === loan.id}
                            onClick={() =>
                              void finishLoan(
                                loan.id,
                                "return",
                                loan.member.name,
                                loan.book.title,
                              )
                            }
                          >
                            Kembalikan
                          </button>

                          <button
                            type="button"
                            className={styles.dangerAction}
                            disabled={processingId === loan.id}
                            onClick={() =>
                              void finishLoan(
                                loan.id,
                                "lost",
                                loan.member.name,
                                loan.book.title,
                              )
                            }
                          >
                            Buku Hilang
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className={styles.stateCell}>
                    Tidak ada pinjaman yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && result.meta.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Halaman pengembalian">
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
