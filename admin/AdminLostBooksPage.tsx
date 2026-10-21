/* eslint-disable @next/next/no-img-element */
"use client";

import AppSelect from "@/components/AppSelect";

import AdminStatCard from "./AdminStatCard";
import { FiBox as CardBox, FiUsers as CardUsers, FiRefreshCw as CardRefreshCw } from "react-icons/fi";

import { safeCoverUrl } from "../shared/displayUrls.cjs";
import { plainTextMessage } from "../members/inputSecurity";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiSearch, FiEye } from "react-icons/fi";

import {
  formatTransactionDate,
  memberTypeLabel,
  transactionApiMessage,
  type LostBooksResponse,
} from "./adminTransactions";
import styles from "./AdminTransactions.module.css";

type MemberFilter = "ALL" | "UMUM" | "MAHASISWA" | "PEGAWAI";
type ExtensionFilter = "ALL" | "EXTENDED" | "NOT_EXTENDED";
type StatusFilter = "ALL" | "PROCESS";

function readStatus(value: string | null): StatusFilter {
  return value === "PROCESS" ? "PROCESS" : "ALL";
}

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
  const params = useSearchParams();
  const [searchInput, setSearchInput] = useState("");
  const searchError = plainTextMessage(searchInput, 100);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>(readStatus(params.get("status")));
  const [memberType, setMemberType] = useState<MemberFilter>("ALL");
  const [extension, setExtension] = useState<ExtensionFilter>("ALL");
  const [page, setPage] = useState(1);

  const [result, setResult] = useState<LostBooksResponse>(emptyResult);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Existing fetch lifecycle starts the loading state before requesting data.
    void load();
  }, [load]);

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1 data-page-title>Buku Hilang & Penggantian</h1>
      </header>

      <section className={styles.statsThree} aria-label="Ringkasan buku hilang">
        <AdminStatCard label="TOTAL BUKU HILANG" value={result.stats.total} tone="coral" icon={<CardBox />}
          detail="kasus tercatat" />

        <AdminStatCard label="ANGGOTA TERDAMPAK" value={result.stats.affectedMembers} tone="slate" icon={<CardUsers />}
          detail="anggota dengan buku hilang" />

        <AdminStatCard label="PERNAH DIPERPANJANG" value={result.stats.extended} tone="primary" icon={<CardRefreshCw />}
          detail="kasus dengan perpanjangan" />
      </section>

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2>Daftar Buku Hilang</h2>
          <p>
            Status penggantian lanjutan dapat ditindaklanjuti berdasarkan
            kebijakan perpustakaan.
          </p>
        </header>

        <div className={styles.filterBar}>
          <label className={styles.searchBox}>
            <FiSearch aria-hidden />
            <input
              type="search"
              maxLength={100}
              aria-invalid={Boolean(searchError)}
              aria-describedby={searchError ? "search-input-error" : undefined}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari anggota, buku, kode buku, atau transaksi..."
              aria-label="Cari buku hilang"
            />
          </label>
          {searchError && <small className={styles.searchError} id="search-input-error" role="alert">{searchError}</small>}

          <label className={styles.selectField}>
            <AppSelect
              aria-label="Filter status proses buku hilang"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="ALL">Semua Status Proses</option>
              <option value="PROCESS">Proses</option>
            </AppSelect>
          </label>

          <label className={styles.selectField}>
            <AppSelect
              aria-label="Filter jenis anggota buku hilang"
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

          <label className={styles.selectField}>
            <AppSelect
              aria-label="Filter riwayat perpanjangan"
              value={extension}
              onChange={(event) => {
                setExtension(event.target.value as ExtensionFilter);
                setPage(1);
              }}
            >
              <option value="ALL">Semua Perpanjangan</option>
              <option value="EXTENDED">Pernah Diperpanjang</option>
              <option value="NOT_EXTENDED">Belum Diperpanjang</option>
            </AppSelect>
          </label>
        </div>

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
          <table data-record-list data-record-scroll className={`${styles.table} ${styles.tableWide} ${styles.transactionTable} ${styles.lostTable}`}>
            <thead>
              <tr>
                <th scope="col">ANGGOTA</th>
                <th scope="col">BUKU</th>
                <th scope="col">JATUH TEMPO</th>
                <th scope="col">STATUS</th>
                <th scope="col" data-record-actions="1">AKSI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.stateCell}>
                    Memuat data buku hilang...
                  </td>
                </tr>
              ) : result.data.length ? (
                result.data.map((loan) => (
                  <tr key={loan.id}>
                    <td>
                      <div className={styles.memberCell}>
                        <strong data-record-primary>{loan.member.name}</strong>
                        <small>{memberTypeLabel(loan.member.memberType)}</small>
                      </div>
                    </td>

                    <td>
                      <div className={styles.bookCell}>
                        <img
                          src={safeCoverUrl(loan.book.coverUrl)}
                          alt=""
                        />
                        <div>
                          <strong data-record-primary>{loan.book.title}</strong>
                          <small>{loan.book.code}</small>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className={styles.memberCell}>
                        <span>{formatTransactionDate(loan.dueAt)}</span>
                        {loan.extensionCount > 0 ? <small data-record-secondary>Perpanjangan {loan.extensionCount} kali</small> : null}
                      </div>
                    </td>

                    <td>
                      <span data-record-badge className={`${styles.pill} ${styles.dangerPill}`}>
                        Buku Hilang
                      </span>
                    </td>

                    <td>
                      <Link data-button-shape="square" title="Lihat detail anggota" aria-label={`Lihat detail anggota ${loan.member.name}`} data-row-action="neutral"
                        data-button="secondary"
                        data-button-size="sm"
                        href={`/admin/keanggotaan/${loan.member.id}`}
                        className={styles.linkAction}
                      >
                        <FiEye aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.stateCell}>
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
