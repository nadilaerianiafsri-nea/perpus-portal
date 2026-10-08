/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";

import {
  formatTransactionDate,
  memberTypeLabel,
  transactionApiMessage,
  transactionId,
  type LostBooksResponse,
} from "./adminTransactions";
import styles from "./AdminTransactions.module.css";

type MemberFilter = "ALL" | "UMUM" | "MAHASISWA" | "PEGAWAI";

type ExtensionFilter = "ALL" | "EXTENDED" | "NOT_EXTENDED";

const emptyResult: LostBooksResponse = {
  stats: {
    total: 0,
    affectedMembers: 0,
    extended: 0,
  },
  data: [],
  meta: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  },
};

export default function AdminLostBooksPage() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [memberType, setMemberType] = useState<MemberFilter>("ALL");
  const [extension, setExtension] = useState<ExtensionFilter>("ALL");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<LostBooksResponse>(emptyResult);
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
      memberType,
      extension,
      page: String(page),
      limit: "20",
    });

    if (search) {
      query.set("search", search);
    }

    try {
      const response = await fetch(
        `/api/members/admin/transactions/lost-books?${query}`,
        {
          cache: "no-store",
        },
      );

      if (!response.ok) {
        throw new Error(
          await transactionApiMessage(
            response,
            "Data buku hilang belum dapat dimuat.",
          ),
        );
      }

      const payload = (await response.json()) as LostBooksResponse;

      if (page > payload.meta.totalPages) {
        setPage(payload.meta.totalPages);
        return;
      }

      setResult(payload);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Data buku hilang belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [extension, memberType, page, revision, search]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1>Buku Hilang & Penggantian</h1>
        <p>
          Pantau buku yang telah dinyatakan hilang dan anggota yang perlu
          ditindaklanjuti.
        </p>
      </header>

      <section className={styles.statsThree} aria-label="Ringkasan buku hilang">
        <article className={`${styles.statCard} ${styles.statRed}`}>
          <span>TOTAL BUKU HILANG</span>
          <strong>{result.stats.total}</strong>
          <small>kasus tercatat</small>
        </article>

        <article className={`${styles.statCard} ${styles.statOrange}`}>
          <span>ANGGOTA TERDAMPAK</span>
          <strong>{result.stats.affectedMembers}</strong>
          <small>anggota dengan buku hilang</small>
        </article>

        <article className={`${styles.statCard} ${styles.statNavy}`}>
          <span>PERNAH DIPERPANJANG</span>
          <strong>{result.stats.extended}</strong>
          <small>kasus dengan perpanjangan</small>
        </article>
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2>Daftar Buku Hilang</h2>
          <p>
            Status penggantian lanjutan dapat ditindaklanjuti berdasarkan
            kebijakan perpustakaan.
          </p>
        </header>

        <div className={`${styles.filterBar} ${styles.filterBarThree}`}>
          <label className={styles.searchBox}>
            <FiSearch aria-hidden />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari anggota, buku, kode buku, atau transaksi..."
              aria-label="Cari buku hilang"
            />
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
            <span>Perpanjangan</span>
            <select
              value={extension}
              onChange={(event) => {
                setExtension(event.target.value as ExtensionFilter);
                setPage(1);
              }}
            >
              <option value="ALL">Semua</option>
              <option value="EXTENDED">Pernah Diperpanjang</option>
              <option value="NOT_EXTENDED">Tidak Pernah</option>
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
                    Memuat data buku hilang...
                  </td>
                </tr>
              ) : result.data.length ? (
                result.data.map((loan) => (
                  <tr key={loan.id}>
                    <td className={styles.transactionCode}>
                      {transactionId(loan.id)}
                    </td>

                    <td>
                      <div className={styles.memberCell}>
                        <strong>{loan.member.name}</strong>
                        <small>{memberTypeLabel(loan.member.memberType)}</small>
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
                      <span className={`${styles.pill} ${styles.dangerPill}`}>
                        Buku Hilang
                      </span>
                    </td>

                    <td>
                      <Link
                        href={`/admin/keanggotaan/${loan.member.id}`}
                        className={styles.linkAction}
                      >
                        Lihat Anggota
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className={styles.stateCell}>
                    Tidak ada kasus buku hilang yang sesuai dengan pencarian
                    atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && result.meta.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Halaman buku hilang">
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
