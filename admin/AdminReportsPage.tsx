"use client";

import TransactionTrendChart from "./TransactionTrendChart";
import { getChartGranularity } from "@/shared/chartTime.cjs";
import AdminStatCard, { type AdminStatTone } from "./AdminStatCard";
import { FiBookOpen as CardBookOpen, FiCheckCircle as CardCheckCircle, FiXCircle as CardXCircle, FiAlertTriangle as CardAlertTriangle, FiStar as CardStar, FiUsers as CardUsers, FiGift as CardGift, FiBox as CardBox } from "react-icons/fi";

import { useEffect, useState } from "react";
import PeriodSelector from "@/components/PeriodSelector";
import { createPeriod, formatPeriodRange, type PeriodValue } from "@/shared/period";
import { csvToRows, downloadExcelWorkbook } from "@/shared/excelExport";
import {
  adminOperationsApiMessage,
  reportCsv,
  type AdminReportResponse,
} from "./adminOperations";
import styles from "./AdminReports.module.css";

const reportCardAppearance: { tone: AdminStatTone; icon: typeof CardBookOpen }[] = [
  { tone: "teal", icon: CardBookOpen }, { tone: "success", icon: CardCheckCircle },
  { tone: "danger", icon: CardXCircle }, { tone: "danger", icon: CardAlertTriangle },
  { tone: "primary", icon: CardStar }, { tone: "slate", icon: CardUsers },
  { tone: "dark", icon: CardGift }, { tone: "coral", icon: CardBox },
];

export default function AdminReportsPage() {
  const [period, setPeriod] = useState<PeriodValue>(() => createPeriod("this-month"));
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string | null;
    report: AdminReportResponse | null;
    error: string;
  }>({ key: null, report: null, error: "" });
  const requestKey = `${period.from}/${period.to}/${revision}`;
  const granularity = getChartGranularity(period, period.preset);
  const report = result.report;
  const loading = result.key !== requestKey;
  const error = loading ? "" : result.error;
  const previousPeriod = Boolean(report && (
    report.range.from !== period.from || report.range.to !== period.to
  ));

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const query = new URLSearchParams({ from: period.from, to: period.to, granularity });
        const response = await fetch(`/api/members/admin/operations/reports?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            await adminOperationsApiMessage(response, "Laporan belum dapat dimuat."),
          );
        }
        const nextReport = (await response.json()) as AdminReportResponse;
        if (!controller.signal.aborted) {
          setResult({ key: requestKey, report: nextReport, error: "" });
        }
      } catch (reason) {
        if (!controller.signal.aborted) {
          setResult((previous) => ({
            key: requestKey,
            report: previous.report,
            error: reason instanceof Error ? reason.message : "Laporan belum dapat dimuat.",
          }));
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [period.from, period.to, granularity, requestKey]);

  function applyPeriod(next: PeriodValue) {
    setPeriod(next);
    // A return to an already loaded range still represents a fresh request.
    setRevision((value) => value + 1);
  }

  function exportReport() {
    if (!report || loading || error || previousPeriod) return;
    downloadExcelWorkbook({
      filename: `laporan-perpustakaan-${report.range.from}-sampai-${report.range.to}.xlsx`,
      sheetName: "Laporan Perpustakaan",
      rows: csvToRows(reportCsv(report)),
      titleRows: [0],
      headerRows: [4, 15],
      freezeRows: 0,
      autoFilter: false,
    });
  }

  const hasTrend = report?.trend.some((row) => row.borrowings > 0 || row.returns > 0);

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
          <h1 data-page-title>Laporan</h1>
        </div>
        <div className={styles.toolbar}>
          <PeriodSelector value={period} onChange={applyPeriod} loading={loading} label="Periode laporan" />
          <button data-button="secondary" data-button-size="md" type="button" className={styles.secondaryButton} onClick={exportReport} disabled={!report || loading || Boolean(error) || previousPeriod}>
            Ekspor
          </button>
        </div>
      </header>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <span>{error}{report ? ` Data yang ditampilkan masih untuk ${formatPeriodRange(report.range)} dan belum diperbarui.` : ""}</span>
          <button data-button="secondary" data-button-size="md" type="button" onClick={() => setRevision((value) => value + 1)}>Coba Lagi</button>
        </div>
      ) : null}

      <section className={styles.reportContent} aria-label="Data laporan" aria-busy={loading}>
      {loading && report ? (
        <p className={styles.loadingStatus} role="status">
          Memuat laporan {formatPeriodRange(period)}… Data {formatPeriodRange(report.range)} tetap ditampilkan.
        </p>
      ) : null}
      {loading && !report ? (
        <div className={styles.loadingBox} role="status">Memuat laporan {formatPeriodRange(period)}…</div>
      ) : report ? (
        <>
          <section className={styles.statsGrid} aria-label="Ringkasan laporan">
            {cards.map(([label, value], index) => {
              const appearance = reportCardAppearance[index];
              const Icon = appearance.icon;
              return <AdminStatCard key={label} label={label} value={value} tone={appearance.tone} icon={<Icon />} detail={formatPeriodRange(report.range)} textValue={index === 4} />;
            })}
          </section>

          <section className={styles.chartCard}>
            <div className={styles.chartHeading}>
              <div>
                <h2>Tren Peminjaman &amp; Pengembalian</h2>
                <p>{formatPeriodRange(report.range)}</p>
              </div>
              <div className={styles.legend} aria-label="Legenda grafik">
                <span><i className={styles.borrowLegend} />Peminjaman</span>
                <span><i className={styles.returnLegend} />Pengembalian</span>
              </div>
            </div>

            {hasTrend ? <TransactionTrendChart rows={report.trend} granularity={report.granularity} /> : (
              <p className={styles.emptyChart} role="status">Tidak ada transaksi pada periode ini. Coba pilih periode lain.</p>
            )}
          </section>
        </>
      ) : null}
      </section>
    </div>
  );
}
