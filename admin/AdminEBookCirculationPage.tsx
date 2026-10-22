"use client";

import AdminStatCard from "./AdminStatCard";
import PeriodSelector from "@/components/PeriodSelector";
import { createTransactionPeriod } from "@/shared/transactionPeriod";
import { FiBookOpen as CardBookOpen, FiUsers as CardUsers, FiClock as CardClock } from "react-icons/fi";

import { useCallback, useEffect, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import { FiSearch, FiDownload } from "react-icons/fi";
import { Button, ButtonLink } from "@/components/Button";
import { downloadTransactionCsv } from "./transactionCsv";
import { jakartaDateInput } from "@/shared/period";
import {
  circulationCsv, circulationDateTime as dateTime, circulationDetailHref, circulationStatusLabel,
  filterCirculationRows, type CirculationPayload as Payload, type CirculationSection as Section,
  type CirculationPerson as Person, type CirculationBook as Book,
} from "./ebookCirculation";
import styles from "./AdminEBookCirculation.module.css";
import periodStyles from "./AdminTransactionPeriod.module.css";

const emptyMeta = { page: 1, limit: 30, total: 0, totalPages: 1 };
const emptyPayload: Payload = {
  activeLoans: { data: [], meta: emptyMeta },
  queues: { data: [], meta: emptyMeta },
  history: { data: [], meta: emptyMeta },
};

export default function AdminEBookCirculationPage() {
  const params = useSearchParams();
  const [section, setSection] = useState<Section>(() => params.get("tab") === "QUEUE" ? "QUEUE" : params.get("tab") === "HISTORY" ? "HISTORY" : "ACTIVE");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState(() => createTransactionPeriod("all"));
  const [data, setData] = useState<Payload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [loadedKey, setLoadedKey] = useState("");
  const requestKey = `${section}:${page}:${search}:${revision}`;
  const busy = loading || (!error && loadedKey !== requestKey);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async (signal: AbortSignal) => {
    void revision;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ page: String(page), limit: "30" });
    if (search) query.set("search", search);
    try {
      const response = await fetch(`/api/admin/ebooks/circulation?${query}`, {
        cache: "no-store", signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          typeof payload?.message === "string"
            ? payload.message
            : "Monitoring E-Book belum dapat dimuat.",
        );
      }
      const parsed = payload as Payload;
      if (signal.aborted) return;
      const targetMeta =
        section === "ACTIVE"
          ? parsed.activeLoans.meta
          : section === "QUEUE"
            ? parsed.queues.meta
            : parsed.history.meta;
      if (page > targetMeta.totalPages) {
        setPage(targetMeta.totalPages);
        return;
      }
      setData(parsed);
      setLoadedKey(requestKey);
    } catch (reason) {
      if (signal.aborted) return;
      setError(
        reason instanceof Error
          ? reason.message
          : "Monitoring E-Book belum dapat dimuat.",
      );
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  }, [page, revision, search, section, requestKey]);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Existing admin pages load remote data from this lifecycle.
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const currentMeta = section === "ACTIVE"
        ? data.activeLoans.meta
        : section === "QUEUE"
          ? data.queues.meta
          : data.history.meta;

  const activeLoans = filterCirculationRows("ACTIVE", data.activeLoans.data, period);
  const queues = filterCirculationRows("QUEUE", data.queues.data, period);
  const history = filterCirculationRows("HISTORY", data.history.data, period);
  const visibleRows = section === "ACTIVE" ? activeLoans : section === "QUEUE" ? queues : history;
  const periodDateLabel = section === "ACTIVE" ? "waktu mulai akses" : section === "QUEUE" ? "waktu masuk antrean" : "waktu selesai akses";
  const exportDisabled = busy || Boolean(error) || searchInput.trim() !== search || !visibleRows.length;

  function exportCsv() {
    if (exportDisabled) return;
    downloadTransactionCsv(circulationCsv(section, visibleRows), `sirkulasi-e-book-${section.toLowerCase()}-halaman-${currentMeta.page}-${jakartaDateInput()}.csv`);
  }

  function tabKeys(event: KeyboardEvent<HTMLDivElement>) {
    const sections: Section[] = ["ACTIVE", "QUEUE", "HISTORY"];
    const index = sections.indexOf(section);
    const next = event.key === "ArrowRight" ? (index + 1) % 3 : event.key === "ArrowLeft" ? (index + 2) % 3 : event.key === "Home" ? 0 : event.key === "End" ? 2 : -1;
    if (next < 0) return;
    event.preventDefault();
    setSection(sections[next]); setPage(1);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <h1 data-page-title>Sirkulasi E-Book</h1>
      </header>

      <section className={styles.summary} aria-label="Ringkasan sirkulasi E-Book">
        <AdminStatCard label="PINJAMAN AKTIF" value={data.activeLoans.meta.total} tone="teal" icon={<CardBookOpen />} />
        <AdminStatCard label="ANTREAN AKTIF" value={data.queues.meta.total} tone="info" icon={<CardUsers />} />
        <AdminStatCard label="RIWAYAT AKSES" value={data.history.meta.total} tone="primary" icon={<CardClock />} />
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Bagian sirkulasi E-Book" onKeyDown={tabKeys}>
            <button id="circulation-tab-ACTIVE" tabIndex={section === "ACTIVE" ? 0 : -1} aria-controls="circulation-records" data-button="secondary" data-button-size="md" data-button-active={section === "ACTIVE"} type="button" role="tab" aria-selected={section === "ACTIVE"} className={section === "ACTIVE" ? styles.activeTab : ""} onClick={() => { setSection("ACTIVE"); setPage(1); }}>Pinjaman Aktif</button>
            <button id="circulation-tab-QUEUE" tabIndex={section === "QUEUE" ? 0 : -1} aria-controls="circulation-records" data-button="secondary" data-button-size="md" data-button-active={section === "QUEUE"} type="button" role="tab" aria-selected={section === "QUEUE"} className={section === "QUEUE" ? styles.activeTab : ""} onClick={() => { setSection("QUEUE"); setPage(1); }}>Antrean</button>
            <button id="circulation-tab-HISTORY" tabIndex={section === "HISTORY" ? 0 : -1} aria-controls="circulation-records" data-button="secondary" data-button-size="md" data-button-active={section === "HISTORY"} type="button" role="tab" aria-selected={section === "HISTORY"} className={section === "HISTORY" ? styles.activeTab : ""} onClick={() => { setSection("HISTORY"); setPage(1); }}>Riwayat</button>
          </div>
        </div>
        <div className={`${periodStyles.ebookFilters} ${styles.filters}`}>
          <label className={styles.search}>
            <FiSearch aria-hidden />
            <input
              type="search"
              maxLength={100}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Cari anggota, email, judul, atau kode E-Book..."
              aria-label="Cari sirkulasi E-Book"
            />
          </label>
          <div className={periodStyles.period}>
            <PeriodSelector mode="transaction" label={`Filter waktu ${periodDateLabel} E-Book`} value={period} onChange={setPeriod} />
          </div>
          <Button className={styles.exportButton} variant="primary" accentHover icon={<FiDownload />} disabled={exportDisabled} onClick={exportCsv} aria-label="Ekspor data Sirkulasi E-Book CSV" title="Ekspor data yang ditampilkan pada tab dan halaman ini">Ekspor CSV</Button>
        </div>
        <p className={`${periodStyles.scope} ${periodStyles.ebookScope}`}>
          Filter berdasarkan {periodDateLabel}.
        </p>

        {error ? (
          <div className={styles.error} role="alert">
            <p>{error}</p>
            <button data-button="secondary" data-button-size="md" type="button" onClick={() => setRevision((value) => value + 1)}>Coba Lagi</button>
          </div>
        ) : null}

        <div id="circulation-records" role="tabpanel" aria-labelledby={`circulation-tab-${section}`} aria-busy={busy} className={styles.tableScroller} data-record-scroll>
          {section === "ACTIVE" ? (
            <table data-record-list data-record-scroll className={styles.table}>
              <thead><tr><th scope="col">ANGGOTA</th><th scope="col">E-BOOK</th><th scope="col">MULAI</th><th scope="col">BATAS AKSES</th><th scope="col">STATUS</th><th className={styles.actionsColumn} scope="col">AKSI</th></tr></thead>
              <tbody>
                {busy ? <StateRow colSpan={6} text="Memuat pinjaman aktif..." /> : error ? <StateRow colSpan={6} text="Data belum tersedia." /> : activeLoans.length ? activeLoans.map((loan) => (
                  <tr key={loan.id}>
                    <td><PersonCell person={loan.user} /></td>
                    <td><BookCell book={loan.book} /></td>
                    <td>{dateTime(loan.borrowedAt)}</td>
                    <td>{dateTime(loan.dueAt)}</td>
                    <td><span data-record-badge className={styles.activePill}>Aktif</span></td>
                    <td><DetailLink section="ACTIVE" id={loan.id} person={loan.user} book={loan.book} /></td>
                  </tr>
                )) : <StateRow colSpan={6} text="Tidak ada pinjaman E-Book aktif yang sesuai dengan filter pada halaman ini." />}
              </tbody>
            </table>
          ) : section === "QUEUE" ? (
            <table data-record-list data-record-scroll className={styles.table}>
              <thead><tr><th scope="col">ANGGOTA</th><th scope="col">E-BOOK</th><th scope="col">POSISI</th><th scope="col">MASUK ANTREAN</th><th scope="col">STATUS</th><th className={styles.actionsColumn} scope="col">AKSI</th></tr></thead>
              <tbody>
                {busy ? <StateRow colSpan={6} text="Memuat antrean..." /> : error ? <StateRow colSpan={6} text="Data belum tersedia." /> : queues.length ? queues.map((queue) => (
                  <tr key={queue.id}>
                    <td><PersonCell person={queue.user} /></td>
                    <td><BookCell book={queue.book} /></td>
                    <td className={styles.position}>{queue.position === null ? "—" : `#${queue.position}`}</td>
                    <td>{dateTime(queue.queuedAt)}</td>
                    <td><div className={styles.cellStack}>
                      <span data-record-badge className={queue.status === "DITAWARKAN" ? styles.offerPill : styles.waitPill}>{circulationStatusLabel(queue.status, "queue")}</span>
                      {queue.status === "DITAWARKAN" && queue.claimExpiresAt ? <small>Sampai {dateTime(queue.claimExpiresAt)}</small> : null}
                    </div></td>
                    <td><DetailLink section="QUEUE" id={queue.id} person={queue.user} book={queue.book} /></td>
                  </tr>
                )) : <StateRow colSpan={6} text="Tidak ada antrean E-Book yang sesuai dengan filter pada halaman ini." />}
              </tbody>
            </table>
          ) : (
            <table data-record-list data-record-scroll className={styles.table}>
              <thead><tr><th scope="col">ANGGOTA</th><th scope="col">E-BOOK</th><th scope="col">PERIODE AKSES</th><th scope="col">SELESAI</th><th scope="col">STATUS AKHIR</th><th className={styles.actionsColumn} scope="col">AKSI</th></tr></thead>
              <tbody>
                {busy ? <StateRow colSpan={6} text="Memuat riwayat..." /> : error ? <StateRow colSpan={6} text="Data belum tersedia." /> : history.length ? history.map((loan) => (
                  <tr key={loan.id}>
                    <td><PersonCell person={loan.user} /></td>
                    <td><BookCell book={loan.book} /></td>
                    <td><div className={styles.cellStack}><span>{dateTime(loan.borrowedAt)}</span><small>Batas {dateTime(loan.dueAt)}</small></div></td>
                    <td>{dateTime(loan.endedAt)}</td>
                    <td><span data-record-badge className={loan.status === "DIKEMBALIKAN" ? styles.returnedPill : styles.expiredPill}>{circulationStatusLabel(loan.status)}</span></td>
                    <td><DetailLink section="HISTORY" id={loan.id} person={loan.user} book={loan.book} /></td>
                  </tr>
                )) : <StateRow colSpan={6} text="Tidak ada riwayat akses E-Book yang sesuai dengan filter pada halaman ini." />}
              </tbody>
            </table>
          )}
        </div>

        {!busy && !error && currentMeta.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Halaman monitoring E-Book">
            <button data-button="secondary" data-button-size="sm" type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Sebelumnya</button>
            <span>Halaman {currentMeta.page} dari {currentMeta.totalPages}</span>
            <button data-button="secondary" data-button-size="sm" type="button" disabled={page >= currentMeta.totalPages} onClick={() => setPage((value) => Math.min(currentMeta.totalPages, value + 1))}>Berikutnya</button>
          </nav>
        ) : null}
      </section>

      <p className={styles.note}>
        Pantau akses, antrean, dan riwayat anggota yang dikelola otomatis oleh sistem.
      </p>
    </div>
  );
}

function DetailLink({ section, id, person, book }: { section: Section; id: number; person: Person; book: Book }) {
  return <ButtonLink className={styles.detailButton} href={circulationDetailHref(section, id)} variant="primary" accentHover aria-label={`Lihat detail ${section === "QUEUE" ? "antrean" : "akses"} E-Book ${book.title} milik ${person.name}`}>Detail</ButtonLink>;
}

function PersonCell({ person }: { person: Person }) {
  return <div className={styles.cellStack}><strong data-record-primary>{person.name}</strong><small>{person.email}</small></div>;
}

function BookCell({ book }: { book: Book }) {
  return <div className={styles.cellStack}><strong data-record-primary>{book.title}</strong><small>{book.code}</small></div>;
}

function StateRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td colSpan={colSpan} className={styles.state}>{text}</td></tr>;
}
