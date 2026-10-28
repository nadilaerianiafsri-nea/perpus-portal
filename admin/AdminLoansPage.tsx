/* eslint-disable @next/next/no-img-element */
"use client";

import AppSelect from "@/components/AppSelect";
import PeriodSelector from "@/components/PeriodSelector";
import { createTransactionPeriod, inTransactionPeriod } from "@/shared/transactionPeriod";
import { jakartaDateInput } from "@/shared/period";
import { ButtonLink } from "@/components/Button";
import { downloadTransactionCsv } from "./transactionCsv";
import { ebookAccessCsv, physicalLoansCsv } from "./adminLoanExports";
import AdminLoanExportMenu from "./AdminLoanExportMenu";

import AdminStatCard from "./AdminStatCard";
import { FiBookOpen as CardBookOpen, FiMonitor as CardMonitor, FiClock as CardClock, FiAlertTriangle as CardAlertTriangle } from "react-icons/fi";

import { safeCoverUrl } from "../shared/displayUrls.cjs";
import { plainTextMessage } from "../members/inputSecurity";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FiSearch, FiMessageCircle } from "react-icons/fi";

import {
  formatTransactionDate,
  memberTypeLabel,
  physicalLoanStatus,
  transactionApiMessage,
  whatsappReminderHref,
  type LoansResponse,
} from "./adminTransactions";
import styles from "./AdminTransactions.module.css";
import ui from "./AdminLoanTools.module.css";

type StatusFilter = "ALL" | "ACTIVE" | "DUE_SOON" | "OVERDUE";
type MemberFilter = "ALL" | "UMUM" | "MAHASISWA" | "PEGAWAI";
type DueFilter = "ALL" | "TODAY" | "7_DAYS" | "30_DAYS" | "THIS_MONTH";

function readStatus(value: string | null): StatusFilter {
  return value === "ACTIVE" || value === "DUE_SOON" || value === "OVERDUE"
    ? value
    : "ALL";
}

function readDue(value: string | null): DueFilter {
  return value === "TODAY" ||
    value === "7_DAYS" ||
    value === "30_DAYS" ||
    value === "THIS_MONTH"
    ? value
    : "ALL";
}

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
  const params = useSearchParams();
  const initialSearch = params.get("search")?.trim() ?? "";
  const [searchInput, setSearchInput] = useState(initialSearch);
  const searchError = plainTextMessage(searchInput, 100);
  const [search, setSearch] = useState(initialSearch);
  const [status, setStatus] = useState<StatusFilter>(readStatus(params.get("status")));
  const [memberType, setMemberType] = useState<MemberFilter>("ALL");
  const [due, setDue] = useState<DueFilter>(readDue(params.get("due")));
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(() => createTransactionPeriod("all"));

  const [result, setResult] = useState<LoansResponse>(emptyResult);
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
    const nextSearch = params.get("search")?.trim() ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize dashboard/detail deep-link filters with existing controls.
    setStatus(readStatus(params.get("status")));
    setDue(readDue(params.get("due")));
    setSearchInput(nextSearch);
    setSearch(nextSearch);
    setPage(1);
  }, [params]);

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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Existing fetch lifecycle starts the loading state before requesting data.
    void load();
  }, [load]);

  const visibleLoans = result.data.filter((loan) => inTransactionPeriod(loan.borrowedAt, period));
  const visibleEbooks = result.ebooks.filter((ebook) => inTransactionPeriod(ebook.addedAt, period));
  const exportPending = loading || Boolean(error) || Boolean(searchError) || searchInput.trim() !== search;

  function exportLoans() {
    if (exportPending || !visibleLoans.length) return;
    downloadTransactionCsv(physicalLoansCsv(visibleLoans), `peminjaman-fisik-halaman-${result.meta.page}-${jakartaDateInput()}.csv`);
  }

  function exportEbooks() {
    if (exportPending || !visibleEbooks.length) return;
    downloadTransactionCsv(ebookAccessCsv(visibleEbooks), `akses-e-book-${jakartaDateInput()}.csv`);
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <h1 data-page-title>Peminjaman</h1>
      </header>

      <section className={styles.statsFour} aria-label="Ringkasan peminjaman">
        <AdminStatCard label="PINJAMAN BUKU FISIK" value={result.stats.physicalActive} tone="teal" icon={<CardBookOpen />}
          detail="sedang berjalan" />

        <AdminStatCard label="AKSES E-BOOK AKTIF" value={result.stats.ebookActive} tone="yellow" icon={<CardMonitor />}
          detail="sedang berjalan" />

        <AdminStatCard label="JATUH TEMPO ≤ 1 HARI" value={result.stats.dueSoon} tone="warning" icon={<CardClock />}
          detail="perlu perhatian" />

        <AdminStatCard label="TERLAMBAT" value={result.stats.overdue} tone="danger" icon={<CardAlertTriangle />}
          detail="melewati jatuh tempo" />
      </section>

        <div className={ui.tools} role="group" aria-label="Filter peminjaman">
          <label className={styles.searchBox}>
            <FiSearch aria-hidden />
            <input
              type="search"
              maxLength={100}
              aria-invalid={Boolean(searchError)}
              aria-describedby={searchError ? "search-input-error" : undefined}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari anggota, judul, kode buku, atau nomor transaksi..."
              aria-label="Cari peminjaman"
            />
          </label>
          {searchError && <small className={styles.searchError} id="search-input-error" role="alert">{searchError}</small>}

          <div className={ui.filters}>
          <label className={styles.selectField} title="Status buku fisik">
            <AppSelect
              aria-label="Filter status peminjaman"
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
            </AppSelect>
          </label>

          <label className={styles.selectField}>
            <AppSelect
              aria-label="Filter jenis anggota peminjaman"
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

          <label className={styles.selectField} title="Jatuh tempo buku fisik">
            <AppSelect
              aria-label="Filter jatuh tempo peminjaman"
              value={due}
              onChange={(event) => {
                setDue(event.target.value as DueFilter);
                setPage(1);
              }}
            >
              <option value="ALL">Semua Jatuh Tempo</option>
              <option value="TODAY">Hari Ini</option>
              <option value="7_DAYS">7 Hari</option>
              <option value="30_DAYS">30 Hari</option>
              <option value="THIS_MONTH">Bulan Ini</option>
            </AppSelect>
          </label>
          <div className={ui.period}>
            <PeriodSelector mode="transaction" label="Filter waktu peminjaman dan akses E-Book" value={period} onChange={setPeriod} />
          </div>
          </div>
          <AdminLoanExportMenu className={ui.exportControl} disabled={exportPending}
            physicalAvailable={visibleLoans.length > 0} ebookAvailable={visibleEbooks.length > 0}
            onPhysical={exportLoans} onEbook={exportEbooks} />
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

      <section className={styles.panel}>
        <header className={styles.panelHeader}>
          <h2>Buku Fisik yang Sedang Dipinjam</h2>
        </header>

        <p className={`${styles.sectionCount} ${styles.transactionCount}`}>{result.meta.total} transaksi</p>

        <div className={`${styles.tableScroller} ${styles.mobileCardScroller}`} data-record-scroll>
          <table data-record-list data-record-scroll className={`${styles.table} ${styles.tableWide} ${styles.transactionTable} ${styles.loansTable} ${styles.mobileCardTable} ${ui.physicalTable}`}>
            <thead>
              <tr>
                <th scope="col">ANGGOTA</th>
                <th scope="col">BUKU</th>
                <th scope="col">DIPINJAM</th>
                <th scope="col">JATUH TEMPO</th>
                <th scope="col">STATUS</th>
                <th scope="col" className={ui.actionsColumn}>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.stateCell}>
                    Memuat data peminjaman...
                  </td>
                </tr>
              ) : visibleLoans.length ? (
                visibleLoans.map((loan) => {
                  const loanStatus = physicalLoanStatus(loan.dueAt);

                  const whatsappHref = whatsappReminderHref(
                    loan.member,
                    loan.book,
                    loan.dueAt,
                  );

                  return (
                    <tr key={loan.id}>
                      <td data-mobile-header="true">
                        <div className={styles.memberCell}>
                          <strong data-record-primary>{loan.member.name}</strong>
                          <small>
                            {memberTypeLabel(loan.member.memberType)}
                          </small>
                        </div>
                      </td>

                      <td data-label="Buku">
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

                      <td data-label="Dipinjam">{formatTransactionDate(loan.borrowedAt)}</td>

                      <td data-label="Jatuh Tempo">
                        <div className={styles.memberCell}>
                          <span>{formatTransactionDate(loan.dueAt)}</span>
                          {loan.extensionCount > 0 ? <small data-record-secondary>Perpanjangan {loan.extensionCount} kali</small> : null}
                        </div>
                      </td>

                      <td data-label="Status">
                        <span data-record-badge
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

                      <td data-label="Aksi">
                        <div className={ui.rowActions}>
                        <ButtonLink variant="primary" accentHover href={`/admin/transaksi/peminjaman/${loan.id}`}
                          aria-label={`Lihat detail peminjaman ${loan.book.title} oleh ${loan.member.name}`}>Detail</ButtonLink>
                        {loanStatus !== "AKTIF" && whatsappHref ? (
                          <a data-button-shape="square" title="Kirim pengingat WhatsApp" aria-label={`Kirim pengingat WhatsApp kepada ${loan.member.name} untuk ${loan.book.title}`} data-row-action="neutral"
                            data-button="secondary"
                            data-button-size="sm"
                            href={whatsappHref}
                            target="_blank"
                            rel="noreferrer"
                            className={styles.secondaryAction}
                          >
                            <FiMessageCircle aria-hidden="true" />
                          </a>
                        ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className={styles.stateCell}>
                    Tidak ada pinjaman yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {!loading && result.meta.totalPages > 1 ? (
          <nav className={`${styles.pagination} ${styles.transactionPagination}`} aria-label="Halaman peminjaman">
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

      <section className={styles.panel}>
        <header className={`${styles.panelHeader} ${styles.panelHeaderBlue}`}>
          <h2>Akses E-Book yang Sedang Berjalan</h2>
        </header>

        <div className={`${styles.tableScroller} ${styles.mobileCardScroller}`} data-record-scroll>
          <table data-record-list data-record-scroll className={`${styles.table} ${styles.transactionTable} ${styles.ebookAccessTable} ${styles.mobileCardTable} ${ui.accessTable}`}>
            <thead>
              <tr>
                <th scope="col">ANGGOTA</th>
                <th scope="col">JUDUL E-BOOK</th>
                <th scope="col">MULAI AKSES</th>
                <th scope="col">BERAKHIR</th>
                <th scope="col" className={ui.accessActionsColumn}>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className={styles.stateCell}>
                    Memuat akses E-Book...
                  </td>
                </tr>
              ) : visibleEbooks.length ? (
                visibleEbooks.map((ebook) => (
                  <tr key={ebook.id}>
                    <td data-mobile-header="true">
                      <div className={styles.memberCell}>
                        <strong>{ebook.member.name}</strong>
                        <small>
                          {memberTypeLabel(ebook.member.memberType)}
                        </small>
                      </div>
                    </td>

                    <td data-label="E-Book"><div className={styles.memberCell}><strong data-record-primary>{ebook.book.title}</strong><small>{ebook.book.code}</small></div></td>

                    <td data-label="Mulai Akses">{formatTransactionDate(ebook.addedAt)}</td>

                    <td data-label="Berakhir">
                      {ebook.endsAt
                        ? formatTransactionDate(ebook.endsAt)
                        : "Tanpa Batas"}
                    </td>

                    <td data-label="Aksi">
                      <ButtonLink variant="primary" accentHover href={`/admin/transaksi/peminjaman/e-book/${ebook.id}`}
                        aria-label={`Lihat detail akses E-Book ${ebook.book.title} oleh ${ebook.member.name}`}>Detail</ButtonLink>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className={styles.stateCell}>
                    Tidak ada akses E-Book yang sesuai dengan pencarian atau filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </section>
    </div>
  );
}
