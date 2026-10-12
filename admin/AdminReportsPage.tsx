"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import {
  adminOperationsApiMessage,
  jakartaDateInput,
  monthsBeforeDateInput,
  reportCsv,
  type AdminReportResponse,
} from "./adminOperations";
import styles from "./AdminReports.module.css";

function validateDates(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return "Dari Tanggal dan Sampai Tanggal wajib diisi.";
  }
  if (from > to) return "Dari Tanggal tidak boleh melewati Sampai Tanggal.";
  return "";
}

export default function AdminReportsPage() {
  const initialTo = useMemo(() => jakartaDateInput(), []);
  const initialFrom = useMemo(() => monthsBeforeDateInput(5), []);
  const [fromInput, setFromInput] = useState(initialFrom);
  const [toInput, setToInput] = useState(initialTo);
  const [range, setRange] = useState({ from: initialFrom, to: initialTo });
  const [report, setReport] = useState<AdminReportResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  const load = useCallback(async () => {
    void revision;
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams(range);
      const response = await fetch(`/api/members/admin/operations/reports?${query}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          await adminOperationsApiMessage(response, "Laporan belum dapat dimuat."),
        );
      }
      setReport((await response.json()) as AdminReportResponse);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Laporan belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, [range, revision]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyRange() {
    const message = validateDates(fromInput, toInput);
    if (message) {
      setError(message);
      return;
    }
    setError("");
    setRange({ from: fromInput, to: toInput });
  }

  function exportReport() {
    if (!report) return;
    const blob = new Blob([reportCsv(report)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `laporan-perpustakaan-${report.range.from}-sampai-${report.range.to}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  const maxTrend = Math.max(
    1,
    ...(report?.trend.flatMap((row) => [row.borrowings, row.returns]) ?? [1]),
  );

  const cards = report
    ? [
        ["Jumlah Peminjaman", report.stats.borrowings.toLocaleString("id-ID")],
        ["Pengembalian", report.stats.returns.toLocaleString("id-ID")],
        ["Reservasi Kedaluwarsa", report.stats.expiredReservations.toLocaleString("id-ID")],
        ["Keterlambatan", report.stats.overdue.toLocaleString("id-ID")],
        ["Buku Populer", report.stats.popularBook],
        ["Anggota Aktif", report.stats.activeMembers.toLocaleString("id-ID")],
        ["Hibah Masuk", `${report.stats.grantsReceived.toLocaleString("id-ID")} eks.`],
        ["Buku Hilang / Penggantian", report.stats.lostBooks.toLocaleString("id-ID")],
      ]
    : [];

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <div>
          <h1>Laporan</h1>
          <p>Ringkasan aktivitas perpustakaan berdasarkan periode yang dipilih.</p>
        </div>
      </header>

      <section className={styles.filterCard} aria-label="Filter periode laporan">
        <label>
          <span>Dari Tanggal</span>
          <input type="date" value={fromInput} onChange={(event) => setFromInput(event.target.value)} />
        </label>
        <label>
          <span>Sampai Tanggal</span>
          <input type="date" value={toInput} onChange={(event) => setToInput(event.target.value)} />
        </label>
        <button type="button" className={styles.primaryButton} onClick={applyRange} disabled={loading && !report}>
          <FiSearch aria-hidden="true" /> Terapkan
        </button>
        <button type="button" className={styles.secondaryButton} onClick={exportReport} disabled={!report || loading}>
          Ekspor
        </button>
      </section>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRevision((value) => value + 1)}>Coba Lagi</button>
        </div>
      ) : null}

      {loading && !report ? (
        <div className={styles.loadingBox}>Memuat laporan...</div>
      ) : report ? (
        <>
          <section className={styles.statsGrid} aria-label="Ringkasan laporan">
            {cards.map(([label, value]) => (
              <article key={label} className={styles.statCard}>
                <span>{label}</span>
                <strong>{value}</strong>
                <small>Periode terpilih</small>
              </article>
            ))}
          </section>

          <section className={styles.chartCard}>
            <div className={styles.chartHeading}>
              <div>
                <h2>Tren Peminjaman &amp; Pengembalian</h2>
                <p>{report.range.from} sampai {report.range.to}</p>
              </div>
              <div className={styles.legend} aria-label="Legenda grafik">
                <span><i className={styles.borrowLegend} />Peminjaman</span>
                <span><i className={styles.returnLegend} />Pengembalian</span>
              </div>
            </div>

            <div className={styles.chartScroller}>
              <div className={styles.chart} role="img" aria-label="Grafik tren peminjaman dan pengembalian">
                {report.trend.map((row) => (
                  <div className={styles.monthGroup} key={row.key}>
                    <div className={styles.barArea}>
                      <div
                        className={`${styles.bar} ${styles.borrowBar}`}
                        style={{ height: `${Math.max(3, (row.borrowings / maxTrend) * 100)}%` }}
                        title={`${row.borrowings} peminjaman`}
                      >
                        <span>{row.borrowings}</span>
                      </div>
                      <div
                        className={`${styles.bar} ${styles.returnBar}`}
                        style={{ height: `${Math.max(3, (row.returns / maxTrend) * 100)}%` }}
                        title={`${row.returns} pengembalian`}
                      >
                        <span>{row.returns}</span>
                      </div>
                    </div>
                    <small>{row.label}</small>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
