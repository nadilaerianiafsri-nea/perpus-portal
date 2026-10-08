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
  whatsappReminderHref,
  type LoansResponse,
} from "./adminTransactions";
import styles from "./AdminTransactions.module.css";

type StatusFilter = "ALL" | "ACTIVE" | "DUE_SOON" | "OVERDUE";

type MemberFilter = "ALL" | "UMUM" | "MAHASISWA" | "PEGAWAI";

type DueFilter = "ALL" | "TODAY" | "7_DAYS" | "30_DAYS" | "THIS_MONTH";

const emptyResult: LoansResponse = {
  stats: {
    physicalActive: 0,
    ebookActive: 0,
    dueSoon: 0,
    overdue: 0,
  },
  data: [],
  ebooks: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

export default function AdminLoansPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("ALL");
  const [memberType, setMemberType] = useState<MemberFilter>("ALL");
  const [due, setDue] = useState<DueFilter>("ALL");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<LoansResponse>(emptyResult);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
      due,
      page: String(page),
      limit: "20",
    });

    if (search) {
      query.set("search", search);
    }

    try {
      const response = await fetch(
        `/api/members/admin/transactions/loans?${query}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          await transactionApiMessage(
            response,
            "Data peminjaman belum dapat dimuat.",
          ),
        );
      }

      const payload = (await response.json()) as LoansResponse;

      if (page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }

      setResult(payload);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Data peminjaman belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [due, memberType, page, revision, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1>Peminjaman</h1>
        <p>
          Pantau pinjaman buku fisik, jatuh tempo, keterlambatan, perpanjangan,
          dan akses E-Book.
        </p>
      </header>

      <section className={styles.statsFour} aria-label="Ringkasan peminjaman">
        <article className={`${styles.statCard} ${styles.statNavy}`}>
          <span>PINJAMAN BUKU FISIK</span>
          <strong>{result.stats.physicalActive}</strong>
          <small>sedang berjalan</small>
        </article>

        <article className={`${styles.statCard} ${styles.statYellow}`}>
          <span>AKSES E-BOOK AKTIF</span>
          <strong>{result.stats.ebookActive}</strong>
          <small>sedang berjalan</small>
        </article>

        <article className={`${styles.statCard} ${styles.statOrange}`}>
          <span>JATUH TEMPO ≤ 1 HARI</span>
          <strong>{result.stats.dueSoon}</strong>
          <small>perlu perhatian</small>
        </article>

        <article className={`${styles.statCard} ${styles.statRed}`}>
          <span>TERLAMBAT</span>
          <strong>{result.stats.overdue}</strong>
          <small>melewati jatuh tempo</small>
        </article>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2>Buku Fisik yang Sedang Dipinjam</h2>
        </header>

        <div className={styles.filterBar}>
          <label className={styles.searchBox}>
            <FiSearch aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari anggota, judul, kode buku, atau nomor transaksi..."
              aria-label="Cari peminjaman"
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
              <option value="ACTIVE">Pinjaman Aktif</option>
              <option value="DUE_SOON">Jatuh Tempo ≤ 1 Hari</option>
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

          <label className={styles.selectField}>
            <span>Jatuh Tempo</span>
            <select
              value={due}
              onChange={(event) => {
                setDue(event.target.value as DueFilter);
                setPage(1);
              }}
            >
              <option value="ALL">Semua Tanggal</option>
              <option value="TODAY">Hari Ini</option>
              <option value="7_DAYS">7 Hari</option>
              <option value="30_DAYS">30 Hari</option>
              <option value="THIS_MONTH">Bulan Ini</option>
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

        <p className={styles.sectionCount}>{result.meta.total} transaksi</p>

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
                    Memuat data peminjaman...
                  </td>
                </tr>
              ) : result.data.length ? (
                result.data.map((loan) => {
                  const loanStatus = physicalLoanStatus(loan.dueAt);

                  const whatsappHref = whatsappReminderHref(
                    loan.member,
                    loan.book,
                    loan.dueAt,
                  );

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
                              ? "Jatuh Tempo ≤ 1 Hari"
                              : "Pinjaman Aktif"}
                        </span>
                      </td>

                      <td>
                        {loanStatus !== "AKTIF" && whatsappHref ? (
                          <a
                            href={whatsappHref}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.secondaryAction}
                          >
                            Kirim WhatsApp
                          </a>
                        ) : (
                          "-"
                        )}
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
          <nav className={styles.pagination} aria-label="Halaman peminjaman">
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

      <section className={styles.panel}>
        <header className={`${styles.panelHeader} ${styles.panelHeaderBlue}`}>
          <h2>Akses E-Book yang Sedang Berjalan</h2>
        </header>

        <div className={styles.tableScroller}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>ID</th>
                <th>ANGGOTA</th>
                <th>JUDUL E-BOOK</th>
                <th>KODE</th>
                <th>MULAI AKSES</th>
                <th>BERAKHIR</th>
                <th>TIPE</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className={styles.stateCell}>
                    Memuat akses E-Book...
                  </td>
                </tr>
              ) : result.ebooks.length ? (
                result.ebooks.map((ebook) => (
                  <tr key={ebook.id}>
                    <td className={styles.transactionCode}>
                      {transactionId(ebook.id, "EB")}
                    </td>

                    <td>
                      <div className={styles.memberCell}>
                        <strong>{ebook.member.name}</strong>
                        <small>
                          {memberTypeLabel(ebook.member.memberType)}
                        </small>
                      </div>
                    </td>

                    <td>{ebook.book.title}</td>
                    <td>{ebook.book.code}</td>

                    <td>{formatTransactionDate(ebook.addedAt)}</td>

                    <td>
                      {ebook.endsAt
                        ? formatTransactionDate(ebook.endsAt)
                        : "Tanpa Batas"}
                    </td>

                    <td>
                      <span className={`${styles.pill} ${styles.bluePill}`}>
                        E-Book
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className={styles.stateCell}>
                    Tidak ada akses E-Book aktif.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.infoNote}>
          Akses E-Book mengikuti durasi akses koleksi digital dan tidak dihitung
          sebagai masa pinjam buku fisik 7 hari.
        </div>
      </section>
    </div>
  );
}
