"use client";

import { ButtonLabel } from '@/components/Button';
import AdminStatCard, { type AdminStatTone } from "./AdminStatCard";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  FiSearch,
  FiUsers,
} from "react-icons/fi";

import {
  adminOperationsApiMessage,
  jakartaDateInput,
} from "./adminOperations";
import styles from "./Admin.module.css";
import controls from "./AdminReports.module.css";
import enhancements from "./AdminEnhancements.module.css";
import filters from "./AdminDashboardFilters.module.css";

type DashboardTrendRow = {
  key: string;
  label: string;
  borrowings: number;
  returns: number;
};

type AdminDashboardResponse = {
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

type DateRange = { from: string; to: string };

function validateDates(from: string, to: string, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return "Dari Tanggal dan Sampai Tanggal wajib diisi.";
  }

  if (from > to) {
    return "Tanggal mulai tidak boleh melebihi tanggal akhir.";
  }

  const start = inputDate(from);
  const finish = inputDate(to);
  if (!start || !finish || start.toISOString().slice(0, 10) !== from || finish.toISOString().slice(0, 10) !== to) {
    return "Tanggal yang dipilih tidak valid.";
  }
  if (from > today || to > today) return "Tanggal tidak boleh melebihi hari ini.";
  if ((finish.getTime() - start.getTime()) / 86_400_000 + 1 > 366) {
    return "Rentang tanggal maksimal 366 hari.";
  }
  return "";
}

function chartPoints(
  rows: DashboardTrendRow[],
  key: "borrowings" | "returns",
  maximum: number,
) {
  if (!rows.length) {
    return "";
  }

  const startX = 48;
  const endX = 835;
  const topY = 32;
  const bottomY = 280;
  const width = endX - startX;
  const height = bottomY - topY;

  return rows
    .map((row, index) => {
      const x =
        rows.length === 1
          ? startX + width / 2
          : startX + (index / (rows.length - 1)) * width;
      const y = bottomY - (row[key] / maximum) * height;

      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function chartCoordinate(
  rows: DashboardTrendRow[],
  index: number,
  value: number,
  maximum: number,
) {
  const startX = 48;
  const endX = 835;
  const topY = 32;
  const bottomY = 280;
  const width = endX - startX;
  const height = bottomY - topY;
  const x =
    rows.length <= 1
      ? startX + width / 2
      : startX + (index / (rows.length - 1)) * width;
  const y = bottomY - (value / maximum) * height;
  return { x, y };
}

function inputDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatRangeLabel(from: string, to: string) {
  const fromDate = inputDate(from);
  const toDate = inputDate(to);

  if (!fromDate || !toDate) return `${from}–${to}`;

  const startYear = fromDate.getUTCFullYear();
  const endYear = toDate.getUTCFullYear();
  const dayMonth = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  const dayMonthYear = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

  if (startYear === endYear) {
    return `${dayMonth.format(fromDate)}–${dayMonthYear.format(toDate)}`;
  }

  return `${dayMonthYear.format(fromDate)}–${dayMonthYear.format(toDate)}`;
}

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
  const today = useMemo(() => jakartaDateInput(), []);
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");
  const [range, setRange] = useState<DateRange | null>(null);
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [chartData, setChartData] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState("");
  const [error, setError] = useState("");
  const [activeTrend, setActiveTrend] = useState<number | null>(null);
  const [activeMemberCategory, setActiveMemberCategory] =
    useState<MemberCategoryKey | null>(null);
  const requestId = useRef(0);
  const requestController = useRef<AbortController | null>(null);

  const load = useCallback(async (selectedRange: DateRange | null) => {
    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;

    setLoading(true);
    setChartLoading(Boolean(selectedRange));
    setError("");
    setChartError("");

    try {
      // This existing endpoint requires dates even for its unfiltered live KPIs.
      // The initial KPI request uses today only; its trend is never presented as an applied filter.
      const query = new URLSearchParams(selectedRange ?? { from: today, to: today });
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
        setDashboard(payload);
        if (selectedRange) setChartData(payload);
      }
    } catch (reason) {
      if (requestId.current === currentRequest && !controller.signal.aborted) {
        const message =
          reason instanceof Error
            ? reason.message
            : "Dashboard admin belum dapat dimuat.";
        if (selectedRange) setChartError(message);
        else setError(message);
      }
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
        setChartLoading(false);
      }
    }
  }, [today]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Load live KPI data once on mount; period requests are explicit user actions.
    void load(null);
    return () => {
      requestId.current += 1;
      requestController.current?.abort();
    };
  }, [load]);

  const dateError = fromInput && toInput ? validateDates(fromInput, toInput, today) : "";

  function applyRange() {
    if (!dashboard || loading || validateDates(fromInput, toInput, today)) return;
    const selectedRange = { from: fromInput, to: toInput };
    setRange(selectedRange);
    setChartData(null);
    setActiveTrend(null);
    void load(selectedRange);
  }

  function resetRange() {
    if (range) {
      requestId.current += 1;
      requestController.current?.abort();
      setLoading(false);
    }
    setFromInput("");
    setToInput("");
    setRange(null);
    setChartData(null);
    setChartError("");
    setChartLoading(false);
    setActiveTrend(null);
  }

  function selectQuickRange(days: number | "month") {
    const end = new Date(`${today}T00:00:00Z`);
    if (days === "month") end.setUTCDate(1);
    else end.setUTCDate(end.getUTCDate() - days + 1);
    setFromInput(end.toISOString().slice(0, 10));
    setToInput(today);
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

  const maxTrend = Math.max(
    1,
    ...(chartData?.trend.flatMap((row) => [row.borrowings, row.returns]) ?? [1]),
  );

  const borrowingPoints = chartData
    ? chartPoints(chartData.trend, "borrowings", maxTrend)
    : "";
  const returnPoints = chartData
    ? chartPoints(chartData.trend, "returns", maxTrend)
    : "";

  const axisValues = [
    maxTrend,
    maxTrend * 0.75,
    maxTrend * 0.5,
    maxTrend * 0.25,
    0,
  ].map((value) => Math.round(value));

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
      <form
        className={filters.filterCard}
        aria-label="Filter periode dashboard admin"
        noValidate
        onSubmit={(event) => { event.preventDefault(); applyRange(); }}
      >
        <div className={filters.filterHeading}>
          <div>
            <h2>Filter Periode</h2>
            <p id="dashboard-period-help">Rentang tanggal hanya berlaku untuk grafik transaksi.</p>
          </div>
          <div className={filters.quickRanges} aria-label="Pilihan rentang tanggal">
            {([{ label: "Hari Ini", value: 1 }, { label: "7 Hari", value: 7 }, { label: "30 Hari", value: 30 }, { label: "Bulan Ini", value: "month" }] as const).map((option) => (
              <button key={option.label} data-button="ghost" data-button-size="sm" type="button" onClick={() => selectQuickRange(option.value)}>{option.label}</button>
            ))}
          </div>
        </div>
        <div className={filters.fields}>
        <label htmlFor="dashboard-date-from">
          <span>Dari Tanggal</span>
          <span className={filters.dateField} data-empty={!fromInput || undefined}>
          <input
            id="dashboard-date-from"
            type="date"
            required
            max={today}
            aria-invalid={Boolean(dateError)}
            aria-describedby={`dashboard-period-help${dateError ? " dashboard-date-error" : ""}`}
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
          />
          {!fromInput && <span className={filters.datePlaceholder} aria-hidden="true">Pilih tanggal mulai</span>}
          </span>
        </label>

        <label htmlFor="dashboard-date-to">
          <span>Sampai Tanggal</span>
          <span className={filters.dateField} data-empty={!toInput || undefined}>
          <input
            id="dashboard-date-to"
            type="date"
            required
            max={today}
            aria-invalid={Boolean(dateError)}
            aria-describedby={`dashboard-period-help${dateError ? " dashboard-date-error" : ""}`}
            value={toInput}
            onChange={(event) => setToInput(event.target.value)}
          />
          {!toInput && <span className={filters.datePlaceholder} aria-hidden="true">Pilih tanggal akhir</span>}
          </span>
        </label>

        <button
          data-button="primary"
          data-button-size="md"
          data-button-loading={chartLoading}
          type="submit"
          aria-busy={chartLoading}
          disabled={!dashboard || loading || !fromInput || !toInput || Boolean(dateError)}
        >
          <FiSearch aria-hidden="true" />
          <ButtonLabel loading={chartLoading} pending="Memuat...">Terapkan</ButtonLabel>
        </button>

        <button
          data-button="ghost"
          data-button-size="md"
          type="button"
          onClick={resetRange}
          disabled={!fromInput && !toInput && !range}
        >
          Reset
        </button>
        </div>
        {dateError ? <p id="dashboard-date-error" className={filters.dateError} role="alert">{dateError}</p> : range && (fromInput !== range.from || toInput !== range.to) ? <p className={filters.draftHint}>Perubahan tanggal belum diterapkan.</p> : null}
      </form>

      {error ? (
        <div className={controls.errorBox} role="alert">
          <span>{error}</span>
          <button
            data-button="secondary"
            data-button-size="md"
            type="button"
            onClick={() => void load(null)}
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
                {range && <button data-button="ghost" data-button-size="sm" type="button" onClick={() => { setActiveTrend(null); void load(range); }} disabled={loading} aria-label="Segarkan Data periode aktif"><FiRefreshCw aria-hidden="true" /><span className={filters.refreshLabel}>Segarkan Data</span></button>}
                </div>
                {range ? <p className={filters.activePeriod} data-active-period>Periode aktif · {formatRangeLabel(range.from, range.to)}{chartData && <> · Diperbarui {formatUpdatedAt(chartData.generatedAt)}</>}</p> : <p>Pilih periode untuk menampilkan transaksi.</p>}

                {range && chartData && !chartLoading && !chartError && chartData.trend.some((row) => row.borrowings > 0 || row.returns > 0) && (
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
                onMouseLeave={() => setActiveTrend(null)}
                style={{ overflowX: "auto" }}
              >
                {!range ? <div className={filters.chartState} role="status"><FiBarChart2 aria-hidden="true" /><strong>Pilih rentang tanggal untuk melihat transaksi peminjaman.</strong><p>Data peminjaman dan pengembalian akan ditampilkan sesuai periode yang Anda pilih.</p></div>
                : chartLoading ? <div className={filters.chartState} role="status"><span className={filters.skeleton} aria-hidden="true" /><span className={filters.skeleton} aria-hidden="true" /><strong>Memuat transaksi peminjaman...</strong></div>
                : chartError ? <div className={filters.chartState} role="alert"><FiAlertTriangle aria-hidden="true" /><strong>{chartError}</strong><button data-button="secondary" data-button-size="sm" type="button" onClick={() => void load(range)}>Coba Lagi</button></div>
                : !chartData?.trend.some((row) => row.borrowings > 0 || row.returns > 0) ? <div className={filters.chartState} role="status"><FiBarChart2 aria-hidden="true" /><strong>Tidak ada transaksi pada periode ini.</strong><p>Coba pilih rentang tanggal lain.</p></div>
                : (
                <div
                  className={enhancements.chartFrame}
                  style={{
                    minWidth: Math.max(620, chartData.trend.length * 92),
                  }}
                >
                  <svg
                    className={styles.lineChart}
                    viewBox="0 0 860 300"
                    role="img"
                    aria-label="Grafik peminjaman dan pengembalian berdasarkan periode terpilih"
                  >
                    <g className={styles.chartGrid}>
                      <line x1="48" y1="32" x2="835" y2="32" />
                      <line x1="48" y1="94" x2="835" y2="94" />
                      <line x1="48" y1="156" x2="835" y2="156" />
                      <line x1="48" y1="218" x2="835" y2="218" />
                      <line x1="48" y1="280" x2="835" y2="280" />
                    </g>

                    <g className={styles.chartAxis}>
                      <text x="8" y="36">
                        {axisValues[0]}
                      </text>
                      <text x="8" y="98">
                        {axisValues[1]}
                      </text>
                      <text x="8" y="160">
                        {axisValues[2]}
                      </text>
                      <text x="8" y="222">
                        {axisValues[3]}
                      </text>
                      <text x="28" y="284">
                        0
                      </text>
                    </g>

                    {borrowingPoints ? (
                      <polyline
                        className={styles.borrowingLine}
                        points={borrowingPoints}
                      />
                    ) : null}

                    {returnPoints ? (
                      <polyline
                        className={styles.returnLine}
                        points={returnPoints}
                      />
                    ) : null}

                    {chartData.trend.map((row, index) => {
                      const borrowing = chartCoordinate(
                        chartData.trend,
                        index,
                        row.borrowings,
                        maxTrend,
                      );
                      const returned = chartCoordinate(
                        chartData.trend,
                        index,
                        row.returns,
                        maxTrend,
                      );

                      return (
                        <g key={`points-${row.key}`}>
                          <circle
                            className={`${enhancements.chartPoint} ${enhancements.borrowingPoint}`}
                            cx={borrowing.x}
                            cy={borrowing.y}
                            r="4"
                            tabIndex={0}
                            aria-label={`${row.label}: ${row.borrowings} peminjaman, ${row.returns} pengembalian`}
                            onMouseEnter={() => setActiveTrend(index)}
                            onFocus={() => setActiveTrend(index)}
                            onClick={() => setActiveTrend(index)}
                          />
                          <circle
                            className={`${enhancements.chartPoint} ${enhancements.returnPoint}`}
                            cx={returned.x}
                            cy={returned.y}
                            r="4"
                            tabIndex={0}
                            aria-label={`${row.label}: ${row.borrowings} peminjaman, ${row.returns} pengembalian`}
                            onMouseEnter={() => setActiveTrend(index)}
                            onFocus={() => setActiveTrend(index)}
                            onClick={() => setActiveTrend(index)}
                          />
                        </g>
                      );
                    })}
                  </svg>

                  {activeTrend !== null && chartData.trend[activeTrend] ? (() => {
                    const row = chartData.trend[activeTrend];
                    const point = chartCoordinate(
                      chartData.trend,
                      activeTrend,
                      Math.max(row.borrowings, row.returns),
                      maxTrend,
                    );
                    return (
                      <div
                        className={`${enhancements.chartTooltip} ${
                          point.y < 82 ? enhancements.chartTooltipBelow : ""
                        }`}
                        role="status"
                        style={{
                          left: `clamp(96px, ${(point.x / 860) * 100}%, calc(100% - 96px))`,
                          top: `${(point.y / 300) * 100}%`,
                        }}
                      >
                        <strong>{row.label}</strong>
                        <span>Peminjaman: {row.borrowings}</span>
                        <span>Pengembalian: {row.returns}</span>
                      </div>
                    );
                  })() : null}

                  <div
                    className={styles.monthLabels}
                    aria-hidden="true"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(
                        1,
                        chartData.trend.length,
                      )}, minmax(0, 1fr))`,
                    }}
                  >
                    {chartData.trend.map((row) => (
                      <span key={row.key}>{row.label}</span>
                    ))}
                  </div>
                </div>
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
    </div>
  );
}
