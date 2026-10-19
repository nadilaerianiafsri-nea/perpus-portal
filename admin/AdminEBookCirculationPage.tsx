"use client";

import AdminStatCard from "./AdminStatCard";
import { FiBookOpen as CardBookOpen, FiUsers as CardUsers, FiClock as CardClock } from "react-icons/fi";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import styles from "./AdminEBookCirculation.module.css";

type Meta = { page: number; limit: number; total: number; totalPages: number };
type Person = { id: number; name: string; email: string };
type Book = { id: number; title: string; code: string; coverUrl: string };
type ActiveLoan = {
  id: number; status: "AKTIF"; borrowedAt: string; dueAt: string;
  user: Person; book: Book;
};
type Queue = {
  id: number; status: "MENUNGGU" | "DITAWARKAN"; queuedAt: string;
  offeredAt: string | null; claimExpiresAt: string | null; position: number | null;
  user: Person; book: Book;
};
type History = {
  id: number; status: "DIKEMBALIKAN" | "KEDALUWARSA";
  borrowedAt: string; dueAt: string; endedAt: string | null;
  user: Person; book: Book;
};
type Payload = {
  activeLoans: { data: ActiveLoan[]; meta: Meta };
  queues: { data: Queue[]; meta: Meta };
  history: { data: History[]; meta: Meta };
};
type Section = "ACTIVE" | "QUEUE" | "HISTORY";

const emptyMeta: Meta = { page: 1, limit: 30, total: 0, totalPages: 1 };
const emptyPayload: Payload = {
  activeLoans: { data: [], meta: emptyMeta },
  queues: { data: [], meta: emptyMeta },
  history: { data: [], meta: emptyMeta },
};

function dateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date).replace(".", ":") + " WIB";
}

function endingLabel(status: History["status"]) {
  return status === "DIKEMBALIKAN" ? "Dikembalikan manual" : "Berakhir otomatis";
}

export default function AdminEBookCirculationPage() {
  const [section, setSection] = useState<Section>("ACTIVE");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Payload>(emptyPayload);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    void revision;
    setLoading(true);
    setError("");
    const query = new URLSearchParams({ page: String(page), limit: "30" });
    if (search) query.set("search", search);
    try {
      const response = await fetch(`/api/admin/ebooks/circulation?${query}`, {
        cache: "no-store",
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
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Monitoring E-Book belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, revision, search, section]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Existing admin pages load remote data from this lifecycle.
    void load();
  }, [load]);

  const currentMeta = useMemo(
    () =>
      section === "ACTIVE"
        ? data.activeLoans.meta
        : section === "QUEUE"
          ? data.queues.meta
          : data.history.meta,
    [data, section],
  );

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <h1>Sirkulasi E-Book</h1>
        <p>
          Monitoring pinjaman digital, antrean, prioritas 24 jam, dan riwayat
          akses E-Book. Proses peminjaman tetap otomatis tanpa persetujuan admin.
        </p>
      </header>

      <section className={styles.summary} aria-label="Ringkasan sirkulasi E-Book">
        <AdminStatCard label="PINJAMAN AKTIF" value={data.activeLoans.meta.total} tone="teal" icon={<CardBookOpen />} />
        <AdminStatCard label="ANTREAN AKTIF" value={data.queues.meta.total} tone="info" icon={<CardUsers />} />
        <AdminStatCard label="RIWAYAT PINJAMAN" value={data.history.meta.total} tone="primary" icon={<CardClock />} />
      </section>

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.tabs} role="tablist" aria-label="Bagian sirkulasi E-Book">
            <button data-button="secondary" data-button-size="md" data-button-active={section === "ACTIVE"} type="button" role="tab" aria-selected={section === "ACTIVE"} className={section === "ACTIVE" ? styles.activeTab : ""} onClick={() => { setSection("ACTIVE"); setPage(1); }}>Pinjaman Aktif</button>
            <button data-button="secondary" data-button-size="md" data-button-active={section === "QUEUE"} type="button" role="tab" aria-selected={section === "QUEUE"} className={section === "QUEUE" ? styles.activeTab : ""} onClick={() => { setSection("QUEUE"); setPage(1); }}>Antrean</button>
            <button data-button="secondary" data-button-size="md" data-button-active={section === "HISTORY"} type="button" role="tab" aria-selected={section === "HISTORY"} className={section === "HISTORY" ? styles.activeTab : ""} onClick={() => { setSection("HISTORY"); setPage(1); }}>Riwayat</button>
          </div>
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
        </div>

        {error ? (
          <div className={styles.error} role="alert">
            <p>{error}</p>
            <button data-button="secondary" data-button-size="md" type="button" onClick={() => setRevision((value) => value + 1)}>Coba Lagi</button>
          </div>
        ) : null}

        <div className={styles.tableScroller}>
          {section === "ACTIVE" ? (
            <table className={styles.table}>
              <thead><tr><th>ANGGOTA</th><th>E-BOOK</th><th>MULAI</th><th>BATAS AKSES</th><th>STATUS</th></tr></thead>
              <tbody>
                {loading ? <StateRow colSpan={5} text="Memuat pinjaman aktif..." /> : data.activeLoans.data.length ? data.activeLoans.data.map((loan) => (
                  <tr key={loan.id}>
                    <td><PersonCell person={loan.user} /></td>
                    <td><BookCell book={loan.book} /></td>
                    <td>{dateTime(loan.borrowedAt)}</td>
                    <td>{dateTime(loan.dueAt)}</td>
                    <td><span className={styles.activePill}>Aktif</span></td>
                  </tr>
                )) : <StateRow colSpan={5} text="Tidak ada pinjaman E-Book aktif." />}
              </tbody>
            </table>
          ) : section === "QUEUE" ? (
            <table className={styles.table}>
              <thead><tr><th>POSISI</th><th>ANGGOTA</th><th>E-BOOK</th><th>MASUK ANTREAN</th><th>PRIORITAS</th><th>STATUS</th></tr></thead>
              <tbody>
                {loading ? <StateRow colSpan={6} text="Memuat antrean..." /> : data.queues.data.length ? data.queues.data.map((queue) => (
                  <tr key={queue.id}>
                    <td className={styles.position}>#{queue.position ?? "-"}</td>
                    <td><PersonCell person={queue.user} /></td>
                    <td><BookCell book={queue.book} /></td>
                    <td>{dateTime(queue.queuedAt)}</td>
                    <td>{queue.status === "DITAWARKAN" ? `Sampai ${dateTime(queue.claimExpiresAt)}` : "Menunggu giliran"}</td>
                    <td><span className={queue.status === "DITAWARKAN" ? styles.offerPill : styles.waitPill}>{queue.status === "DITAWARKAN" ? "Prioritas 24 Jam" : "Menunggu"}</span></td>
                  </tr>
                )) : <StateRow colSpan={6} text="Tidak ada anggota dalam antrean E-Book." />}
              </tbody>
            </table>
          ) : (
            <table className={styles.table}>
              <thead><tr><th>ANGGOTA</th><th>E-BOOK</th><th>MULAI</th><th>BATAS AKSES</th><th>SELESAI</th><th>HASIL</th></tr></thead>
              <tbody>
                {loading ? <StateRow colSpan={6} text="Memuat riwayat..." /> : data.history.data.length ? data.history.data.map((loan) => (
                  <tr key={loan.id}>
                    <td><PersonCell person={loan.user} /></td>
                    <td><BookCell book={loan.book} /></td>
                    <td>{dateTime(loan.borrowedAt)}</td>
                    <td>{dateTime(loan.dueAt)}</td>
                    <td>{dateTime(loan.endedAt)}</td>
                    <td><span className={loan.status === "DIKEMBALIKAN" ? styles.returnedPill : styles.expiredPill}>{endingLabel(loan.status)}</span></td>
                  </tr>
                )) : <StateRow colSpan={6} text="Belum ada riwayat peminjaman E-Book." />}
              </tbody>
            </table>
          )}
        </div>

        {!loading && currentMeta.totalPages > 1 ? (
          <nav className={styles.pagination} aria-label="Halaman monitoring E-Book">
            <button data-button="secondary" data-button-size="sm" type="button" disabled={page <= 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Sebelumnya</button>
            <span>Halaman {currentMeta.page} dari {currentMeta.totalPages}</span>
            <button data-button="secondary" data-button-size="sm" type="button" disabled={page >= currentMeta.totalPages} onClick={() => setPage((value) => Math.min(currentMeta.totalPages, value + 1))}>Berikutnya</button>
          </nav>
        ) : null}
      </section>

      <p className={styles.note}>
        Halaman ini hanya untuk monitoring. Admin tidak menyetujui, menolak,
        memperpanjang, atau mengakhiri pinjaman E-Book.
      </p>
    </div>
  );
}

function PersonCell({ person }: { person: Person }) {
  return <div className={styles.cellStack}><strong>{person.name}</strong><small>{person.email}</small></div>;
}

function BookCell({ book }: { book: Book }) {
  return <div className={styles.cellStack}><strong>{book.title}</strong><small>{book.code}</small></div>;
}

function StateRow({ colSpan, text }: { colSpan: number; text: string }) {
  return <tr><td colSpan={colSpan} className={styles.state}>{text}</td></tr>;
}
