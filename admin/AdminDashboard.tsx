"use client";

import Link from "next/link";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiAlertTriangle,
  FiBookOpen,
  FiBox,
  FiCheckCircle,
  FiClock,
  FiLayers,
  FiMonitor,
  FiPackage,
  FiSearch,
  FiUsers,
} from "react-icons/fi";

import {
  adminOperationsApiMessage,
  jakartaDateInput,
  monthsBeforeDateInput,
} from "./adminOperations";
import styles from "./Admin.module.css";
import controls from "./AdminReports.module.css";
import enhancements from "./AdminEnhancements.module.css";

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
  tone: string;
  href: string;
};

function validateDates(from: string, to: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return "Dari Tanggal dan Sampai Tanggal wajib diisi.";
  }

  if (from > to) {
    return "Dari Tanggal tidak boleh melewati Sampai Tanggal.";
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

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export default function AdminDashboard() {
  const initialTo = useMemo(() => jakartaDateInput(), []);
  const initialFrom = useMemo(() => monthsBeforeDateInput(5), []);

  const [fromInput, setFromInput] = useState(initialFrom);
  const [toInput, setToInput] = useState(initialTo);
  const [range, setRange] = useState({
    from: initialFrom,
    to: initialTo,
  });
  const [dashboard, setDashboard] = useState<AdminDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [activeTrend, setActiveTrend] = useState<number | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    void revision;

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;

    setLoading(true);
    setError("");

    try {
      const query = new URLSearchParams(range);
      const response = await fetch(
        `/api/members/admin/operations/dashboard?${query}`,
        {
          cache: "no-store",
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
      }
    } catch (reason) {
      if (requestId.current === currentRequest) {
        setError(
          reason instanceof Error
            ? reason.message
            : "Dashboard admin belum dapat dimuat.",
        );
      }
    } finally {
      if (requestId.current === currentRequest) {
        setLoading(false);
      }
    }
  }, [range, revision]);

  useEffect(() => {
    void load();

    const interval = window.setInterval(() => {
      void load();
    }, 30_000);

    const refreshOnFocus = () => {
      void load();
    };

    window.addEventListener("focus", refreshOnFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [load]);

  function applyRange() {
    const message = validateDates(fromInput, toInput);

    if (message) {
      setError(message);
      return;
    }

    setError("");
    setRange({
      from: fromInput,
      to: toInput,
    });
  }

  const statCards: StatCard[] = dashboard
    ? [
        {
          label: "TOTAL KOLEKSI",
          value: dashboard.stats.totalCollections.toLocaleString("id-ID"),
          icon: FiBookOpen,
          tone: styles.statNavy,
          href: "/admin/koleksi/data-buku",
        },
        {
          label: "TOTAL STOK BUKU",
          value: dashboard.stats.totalStock.toLocaleString("id-ID"),
          icon: FiLayers,
          tone: styles.statSlate,
          href: "/admin/koleksi/data-buku",
        },
        {
          label: "STOK TERSEDIA",
          value: dashboard.stats.availableStock.toLocaleString("id-ID"),
          icon: FiCheckCircle,
          tone: styles.statGreen,
          href: "/admin/koleksi/data-buku",
        },
        {
          label: "MENUNGGU PENGAMBILAN",
          value: dashboard.stats.waitingPickup.toLocaleString("id-ID"),
          icon: FiClock,
          tone: styles.statBlue,
          href: "/admin/transaksi/reservasi",
        },
        {
          label: "PEMINJAMAN AKTIF",
          value: dashboard.stats.activeLoans.toLocaleString("id-ID"),
          icon: FiPackage,
          tone: styles.statTeal,
          href: "/admin/transaksi/peminjaman",
        },
        {
          label: "JATUH TEMPO HARI INI",
          value: dashboard.stats.dueToday.toLocaleString("id-ID"),
          icon: FiAlertTriangle,
          tone: styles.statOrange,
          href: "/admin/transaksi/peminjaman",
        },
        {
          label: "TERLAMBAT",
          value: dashboard.stats.overdue.toLocaleString("id-ID"),
          icon: FiAlertTriangle,
          tone: styles.statRed,
          href: "/admin/transaksi/peminjaman",
        },
        {
          label: "BUKU HILANG (PROSES)",
          value: dashboard.stats.lostInProcess.toLocaleString("id-ID"),
          icon: FiBox,
          tone: styles.statCoral,
          href: "/admin/transaksi/buku-hilang-penggantian",
        },
        {
          label: "TOTAL ANGGOTA",
          value: dashboard.stats.totalMembers.toLocaleString("id-ID"),
          icon: FiUsers,
          tone: styles.statMember,
          href: "/admin/keanggotaan",
        },
        {
          label: "E-BOOK",
          value: dashboard.stats.ebooks.toLocaleString("id-ID"),
          icon: FiMonitor,
          tone: styles.statYellow,
          href: "/admin/koleksi/e-book",
        },
      ]
    : [];

  const maxTrend = Math.max(
    1,
    ...(dashboard?.trend.flatMap((row) => [row.borrowings, row.returns]) ?? [1]),
  );

  const borrowingPoints = dashboard
    ? chartPoints(dashboard.trend, "borrowings", maxTrend)
    : "";
  const returnPoints = dashboard
    ? chartPoints(dashboard.trend, "returns", maxTrend)
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

  const umumEnd =
    memberTotal > 0
      ? (dashboard!.memberCategories.umum / memberTotal) * 100
      : 0;
  const mahasiswaEnd =
    memberTotal > 0
      ? ((dashboard!.memberCategories.umum +
          dashboard!.memberCategories.mahasiswa) /
          memberTotal) *
        100
      : 0;

  const donutBackground =
    memberTotal > 0
      ? `conic-gradient(#2d345f 0 ${umumEnd}%, #2aaef3 ${umumEnd}% ${mahasiswaEnd}%, #ffd000 ${mahasiswaEnd}% 100%)`
      : "#dedfe5";

  return (
    <div className={styles.content}>
      <section
        className={controls.filterCard}
        aria-label="Filter periode dashboard admin"
      >
        <label>
          <span>Dari Tanggal</span>
          <input
            type="date"
            value={fromInput}
            onChange={(event) => setFromInput(event.target.value)}
          />
        </label>

        <label>
          <span>Sampai Tanggal</span>
          <input
            type="date"
            value={toInput}
            onChange={(event) => setToInput(event.target.value)}
          />
        </label>

        <button
          type="button"
          className={controls.primaryButton}
          onClick={applyRange}
          disabled={loading && !dashboard}
        >
          <FiSearch aria-hidden="true" />
          Terapkan
        </button>

        <button
          type="button"
          className={controls.secondaryButton}
          onClick={() => setRevision((value) => value + 1)}
          disabled={loading}
        >
          {loading && dashboard ? "Memuat..." : "Segarkan"}
        </button>
      </section>

      {error ? (
        <div className={controls.errorBox} role="alert">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRevision((value) => value + 1)}
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

              return (
                <Link
                  key={card.label}
                  href={card.href}
                  className={`${styles.statCard} ${card.tone} ${enhancements.clickableStatCard} ${enhancements.forceWhiteStatCard}`}
                  aria-label={`${card.label}: ${card.value}. Buka halaman terkait.`}
                >
                  <span className={styles.statIcon}>
                    <Icon size={24} />
                  </span>

                  <div>
                    <span className={styles.statLabel}>{card.label}</span>
                    <strong>{card.value}</strong>
                  </div>
                </Link>
              );
            })}
          </section>

          <section className={styles.analyticsGrid}>
            <article className={styles.chartCard}>
              <header>
                <h2>Transaksi Peminjaman</h2>
                <p>
                  {dashboard.range.from} sampai {dashboard.range.to} · diperbarui{" "}
                  {formatUpdatedAt(dashboard.generatedAt)}
                </p>

                <div
                  className={controls.legend}
                  aria-label="Legenda transaksi peminjaman"
                  style={{ marginTop: 10 }}
                >
                  <span>
                    <i className={controls.borrowLegend} />
                    Peminjaman
                  </span>
                  <span>
                    <i className={controls.returnLegend} />
                    Pengembalian
                  </span>
                </div>
              </header>

              <div
                className={styles.lineChartWrap}
                aria-label="Grafik transaksi peminjaman"
                onMouseLeave={() => setActiveTrend(null)}
                style={{ overflowX: "auto" }}
              >
                <div
                  className={enhancements.chartFrame}
                  style={{
                    minWidth: Math.max(620, dashboard.trend.length * 92),
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
                        className={styles.lineDark}
                        points={borrowingPoints}
                      />
                    ) : null}

                    {returnPoints ? (
                      <polyline
                        className={styles.lineBlue}
                        points={returnPoints}
                      />
                    ) : null}

                    {dashboard.trend.map((row, index) => {
                      const borrowing = chartCoordinate(
                        dashboard.trend,
                        index,
                        row.borrowings,
                        maxTrend,
                      );
                      const returned = chartCoordinate(
                        dashboard.trend,
                        index,
                        row.returns,
                        maxTrend,
                      );

                      return (
                        <g key={`points-${row.key}`}>
                          <circle
                            className={`${enhancements.chartPoint} ${enhancements.chartPointDark}`}
                            cx={borrowing.x}
                            cy={borrowing.y}
                            r="6"
                            tabIndex={0}
                            aria-label={`${row.label}: ${row.borrowings} peminjaman, ${row.returns} pengembalian`}
                            onMouseEnter={() => setActiveTrend(index)}
                            onFocus={() => setActiveTrend(index)}
                            onClick={() => setActiveTrend(index)}
                          />
                          <circle
                            className={`${enhancements.chartPoint} ${enhancements.chartPointBlue}`}
                            cx={returned.x}
                            cy={returned.y}
                            r="6"
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

                  {activeTrend !== null && dashboard.trend[activeTrend] ? (() => {
                    const row = dashboard.trend[activeTrend];
                    const point = chartCoordinate(
                      dashboard.trend,
                      activeTrend,
                      Math.max(row.borrowings, row.returns),
                      maxTrend,
                    );
                    return (
                      <div
                        className={enhancements.chartTooltip}
                        role="status"
                        style={{
                          left: `${(point.x / 860) * 100}%`,
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
                        dashboard.trend.length,
                      )}, minmax(0, 1fr))`,
                    }}
                  >
                    {dashboard.trend.map((row) => (
                      <span key={row.key}>{row.label}</span>
                    ))}
                  </div>
                </div>
              </div>
            </article>

            <article className={styles.memberCard}>
              <header>
                <h2>Kategori Anggota</h2>
                <p>Data anggota saat ini</p>
              </header>

              <div className={styles.donutArea}>
                <div
                  className={styles.donut}
                  aria-label="Diagram kategori anggota"
                  style={{ background: donutBackground }}
                />

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
