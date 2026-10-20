"use client";

import TransactionTrendChart from "./TransactionTrendChart";
import AdminDashboardInsights from "./AdminDashboardInsights";
import type { DashboardInsightsData } from "./dashboardInsights";
import { getChartGranularity, type ChartGranularity, type TransactionTrendRow } from "@/shared/chartTime.cjs";
import PeriodSelector from "@/components/PeriodSelector";
import { createPeriod, formatPeriodRange, jakartaDateInput, type PeriodValue } from "@/shared/period";
import AdminStatCard, { type AdminStatTone } from "./AdminStatCard";
import type { ComponentType } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiBarChart2,
  FiBookOpen,
  FiBox,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiMonitor,
  FiPackage,
  FiRefreshCw,
  FiUsers,
} from "react-icons/fi";

import {
  adminOperationsApiMessage,
} from "./adminOperations";
import styles from "./Admin.module.css";
import controls from "./AdminReports.module.css";
import enhancements from "./AdminEnhancements.module.css";
import filters from "./AdminDashboardFilters.module.css";

type DashboardTrendRow = TransactionTrendRow;

type AdminDashboardResponse = DashboardInsightsData & {
  generatedAt: string;
  range: {
    from: string;
    to: string;
  };
  stats: {
    totalCollections: number;
    totalStock: number;
    availableStock: number;
    waitingPickup: number;
    activeLoans: number;
    dueToday: number;
    overdue: number;
    lostInProcess: number;
    totalMembers: number;
    ebooks: number;
  };
  memberCategories: {
    umum: number;
    mahasiswa: number;
    pegawai: number;
  };
  granularity: ChartGranularity;
  trend: DashboardTrendRow[];
};

type StatCard = {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number }>;
  tone: AdminStatTone;
  href: string;
};

type MemberCategoryKey = "umum" | "mahasiswa" | "pegawai";

type DateRange = PeriodValue;

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default function AdminDashboard() {
  const [initialPeriod] = useState(() => createPeriod("this-month"));
  const [range, setRange] = useState(initialPeriod);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [chartData, setChartData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState("");
  const [error, setError] = useState("");
  const [activeMemberCategory, setActiveMemberCategory] =
    useState<MemberCategoryKey | null>(null);
  const requestId = useRef(0);
  const requestController = useRef<AbortController | null>(null);

  const load = useCallback(async (selectedRange: DateRange, chartOnly = false) => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;

    if (!chartOnly) { setLoading(true); setError(""); }
    setChartLoading(true);
    setChartError("");

    try {
      // Live KPIs are independent of the existing endpoint's trend period.
      const query = new URLSearchParams({ from: selectedRange.from, to: selectedRange.to, granularity: getChartGranularity(selectedRange, selectedRange.preset) });
      const response = await fetch(
        `/api/members/admin/operations/dashboard?${query}`,
        {
          cache: "no-store",
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          await adminOperationsApiMessage(
            response,
            "Dashboard admin belum dapat dimuat.",
          ),
        );
      }

      const payload = (await response.json()) as AdminDashboardResponse;

      if (requestId.current === currentRequest) {
        if (!chartOnly) setDashboard(payload);
        setChartData(payload);
      }
    } catch (reason) {
      if (requestId.current === currentRequest && !controller.signal.aborted) {
        const message =
          reason instanceof Error
            ? reason.message
            : "Dashboard admin belum dapat dimuat.";
        if (chartOnly) setChartError(message);
        else setError(message);
      }
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setChartLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load the existing dashboard endpoint with this month's initial trend.
    void load(initialPeriod);
    return () => {
      requestId.current += 1;
      requestController.current?.abort();
    };
  }, [initialPeriod, load]);

  function applyPeriod(next: PeriodValue) {
    setRange(next);
    void load(next, true);
  }

  const statCards: StatCard[] = dashboard
    ? [
        {
          label: "TOTAL KOLEKSI",
          value: dashboard.stats.totalCollections.toLocaleString("id-ID"),
          icon: FiBookOpen,
          tone: "dark",
          href: "/admin/koleksi/data-buku",
        },
        {
          label: "TOTAL STOK BUKU",
          value: dashboard.stats.totalStock.toLocaleString("id-ID"),
          icon: FiLayers,
          tone: "primary",
          href: "/admin/koleksi/data-buku",
        },
        {
          label: "STOK TERSEDIA",
          value: dashboard.stats.availableStock.toLocaleString("id-ID"),
          icon: FiCheckCircle,
          tone: "success",
          href: "/admin/koleksi/data-buku?availability=TERSEDIA",
        },
        {
          label: "MENUNGGU PENGAMBILAN",
          value: dashboard.stats.waitingPickup.toLocaleString("id-ID"),
          icon: FiClock,
          tone: "info",
          href: "/admin/transaksi/reservasi?status=MENUNGGU_PENGAMBILAN",
        },
        {
          label: "PEMINJAMAN AKTIF",
          value: dashboard.stats.activeLoans.toLocaleString("id-ID"),
          icon: FiPackage,
          tone: "teal",
          href: "/admin/transaksi/peminjaman?status=ACTIVE",
        },
        {
          label: "JATUH TEMPO HARI INI",
          value: dashboard.stats.dueToday.toLocaleString("id-ID"),
          icon: FiAlertTriangle,
          tone: "warning",
          href: "/admin/transaksi/peminjaman?due=TODAY",
        },
        {
          label: "TERLAMBAT",
          value: dashboard.stats.overdue.toLocaleString("id-ID"),
          icon: FiAlertTriangle,
          tone: "danger",
          href: "/admin/transaksi/peminjaman?status=OVERDUE",
        },
        {
          label: "BUKU HILANG (PROSES)",
          value: dashboard.stats.lostInProcess.toLocaleString("id-ID"),
          icon: FiBox,
          tone: "coral",
          href: "/admin/transaksi/buku-hilang-penggantian?status=PROCESS",
        },
        {
          label: "TOTAL ANGGOTA",
          value: dashboard.stats.totalMembers.toLocaleString("id-ID"),
          icon: FiUsers,
          tone: "slate",
          href: "/admin/keanggotaan",
        },
        {
          label: "E-BOOK",
          value: dashboard.stats.ebooks.toLocaleString("id-ID"),
          icon: FiMonitor,
          tone: "yellow",
          href: "/admin/koleksi/e-book",
        },
      ]
    : [];

  const memberTotal = dashboard
    ? dashboard.memberCategories.umum +
      dashboard.memberCategories.mahasiswa +
      dashboard.memberCategories.pegawai
    : 0;

  let memberOffset = 0;
  const memberSegments = dashboard
    ? ([
        {
          key: "umum" as const,
          label: "Masyarakat Umum",
          value: dashboard.memberCategories.umum,
          tone: enhancements.memberSegmentNavy,
        },
        {
          key: "mahasiswa" as const,
          label: "Mahasiswa",
          value: dashboard.memberCategories.mahasiswa,
          tone: enhancements.memberSegmentBlue,
        },
        {
          key: "pegawai" as const,
          label: "Pegawai Internal",
          value: dashboard.memberCategories.pegawai,
          tone: enhancements.memberSegmentYellow,
        },
      ]).map((category) => {
        const percentage = memberTotal > 0 ? (category.value / memberTotal) * 100 : 0;
        const start = memberOffset;
        memberOffset += percentage;
        return { ...category, percentage, start };
      })
    : [];

  const activeMember = memberSegments.find(
    (segment) => segment.key === activeMemberCategory,
  );

  return (
    <div className={styles.content}>
      {error ? (
        <div className={controls.errorBox} role="alert">
          <span>{error}</span>
          <button
            data-button="secondary"
            data-button-size="md"
            type="button"
            onClick={() => void load(range)}
            disabled={loading}
          >
            Coba Lagi
          </button>
        </div>
      ) : null}

      {loading && !dashboard ? (
        <div className={controls.loadingBox}>Memuat dashboard admin...</div>
      ) : dashboard ? (
        <>
          <section
            className={styles.statsGrid}
            aria-label="Statistik dashboard admin"
          >
            {statCards.map((card) => {
              const Icon = card.icon;
              return <AdminStatCard key={card.label} label={card.label} value={card.value} tone={card.tone} icon={<Icon size={23} />} href={card.href} />;
            })}
          </section>

          <section className={styles.analyticsGrid}>
            <article className={styles.chartCard}>
              <header className={filters.chartHeader}>
                <div className={filters.chartHeading}>
                  <h2>Transaksi Peminjaman</h2>
                  <div className={filters.chartControls}>
                    <PeriodSelector value={range} onChange={applyPeriod} loading={chartLoading} maxDate={jakartaDateInput()} label="Periode transaksi peminjaman" />
                    <button data-button="icon" data-button-size="md" type="button" onClick={() => { void load(range, true); }} disabled={chartLoading} aria-label="Segarkan transaksi" title="Segarkan"><FiRefreshCw aria-hidden="true" /></button>
                  </div>
                </div>
                <p className={filters.activePeriod} data-active-period>Periode aktif: {formatPeriodRange(range)}{chartData && !chartLoading && !chartError && <> · Diperbarui {formatUpdatedAt(chartData.generatedAt)}</>}</p>

                {chartData && !chartLoading && !chartError && chartData.trend.some((row) => row.borrowings > 0 || row.returns > 0) && (
                <div
                  className={styles.transactionLegend}
                  aria-label="Legenda transaksi peminjaman"
                >
                  <span>
                    <i className={styles.borrowingLegend} aria-hidden="true" />
                    Peminjaman
                  </span>
                  <span>
                    <i className={styles.returnLegend} aria-hidden="true" />
                    Pengembalian
                  </span>
                </div>
                )}
              </header>

              <div
                className={`${styles.lineChartWrap} ${filters.chartBody}`}
                aria-label="Grafik transaksi peminjaman"
                aria-busy={chartLoading}
              >
                {chartLoading ? <div className={filters.chartState} role="status"><span className={filters.skeleton} aria-hidden="true" /><span className={filters.skeleton} aria-hidden="true" /><strong>Memuat transaksi peminjaman...</strong></div>
                : chartError ? <div className={filters.chartState} role="alert"><FiAlertTriangle aria-hidden="true" /><strong>{chartError}</strong><button data-button="secondary" data-button-size="sm" type="button" onClick={() => void load(range, true)}>Coba Lagi</button></div>
                : !chartData?.trend.some((row) => row.borrowings > 0 || row.returns > 0) ? <div className={filters.chartState} role="status"><FiBarChart2 aria-hidden="true" /><strong>Tidak ada transaksi pada periode ini.</strong><p>Coba pilih periode lain.</p></div>
                : (
                <TransactionTrendChart rows={chartData.trend} granularity={chartData.granularity} />
                )}
              </div>
            </article>

            <article className={styles.memberCard}>
              <header>
                <h2>Kategori Anggota</h2>
                <p>Data anggota saat ini</p>
              </header>

              <div className={styles.donutArea}>
                <div
                  className={enhancements.memberDonutWrap}
                  onMouseLeave={() => setActiveMemberCategory(null)}
                >
                  <svg
                    className={enhancements.memberDonut}
                    viewBox="0 0 120 120"
                    role="img"
                    aria-label={`Diagram kategori anggota, total ${memberTotal.toLocaleString("id-ID")} anggota. Arahkan kursor atau fokuskan segmen untuk melihat jumlah dan persentase.`}
                  >
                    <circle
                      className={enhancements.memberDonutTrack}
                      cx="60"
                      cy="60"
                      r="44"
                    />
                    {memberSegments.map((segment) => (
                      <circle
                        key={segment.key}
                        className={`${enhancements.memberDonutSegment} ${segment.tone}`}
                        cx="60"
                        cy="60"
                        r="44"
                        pathLength="100"
                        strokeDasharray={`${segment.percentage} ${100 - segment.percentage}`}
                        strokeDashoffset={-segment.start}
                        tabIndex={0}
                        aria-label={`${segment.label}: ${segment.value.toLocaleString("id-ID")} anggota, ${segment.percentage.toFixed(1)} persen`}
                        onMouseEnter={() => setActiveMemberCategory(segment.key)}
                        onFocus={() => setActiveMemberCategory(segment.key)}
                        onClick={() => setActiveMemberCategory(segment.key)}
                      />
                    ))}
                  </svg>

                  <div className={enhancements.memberDonutTotal} data-member-total aria-hidden="true">
                    <strong>{memberTotal.toLocaleString("id-ID")}</strong>
                    <span>Anggota</span>
                  </div>

                  {activeMember ? (
                    <div className={enhancements.memberChartTooltip} role="status">
                      <strong>{activeMember.label}</strong>
                      <span>{activeMember.value.toLocaleString("id-ID")} anggota</span>
                      <span>{activeMember.percentage.toFixed(1)}%</span>
                    </div>
                  ) : null}
                </div>

                <div className={styles.legend}>
                  <div>
                    <i className={styles.legendNavy} />
                    <span>Masyarakat Umum</span>
                    <strong>
                      {dashboard.memberCategories.umum.toLocaleString("id-ID")}
                    </strong>
                  </div>

                  <div>
                    <i className={styles.legendBlue} />
                    <span>Mahasiswa</span>
                    <strong>
                      {dashboard.memberCategories.mahasiswa.toLocaleString(
                        "id-ID",
                      )}
                    </strong>
                  </div>

                  <div>
                    <i className={styles.legendYellow} />
                    <span>Pegawai Internal</span>
                    <strong>
                      {dashboard.memberCategories.pegawai.toLocaleString(
                        "id-ID",
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </article>
          </section>
        </>
      ) : null}
      <AdminDashboardInsights key={dashboard?.generatedAt ?? "initial-insights"} data={dashboard} loading={loading} failed={Boolean(error)} period={initialPeriod} />
    </div>
  );
}
