import type { ComponentType } from "react";
import {
  FiAlertTriangle,
  FiBookOpen,
  FiBox,
  FiCheckCircle,
  FiClock,
  FiInfo,
  FiLayers,
  FiMonitor,
  FiPackage,
  FiUsers,
} from "react-icons/fi";

import styles from "./Admin.module.css";

type StatCard = {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number }>;
  tone: string;
};

const statCards: StatCard[] = [
  { label: "TOTAL KOLEKSI", value: "3.812", icon: FiBookOpen, tone: styles.statNavy },
  { label: "TOTAL STOK BUKU", value: "9.540", icon: FiLayers, tone: styles.statSlate },
  { label: "STOK TERSEDIA", value: "7.126", icon: FiCheckCircle, tone: styles.statGreen },
  { label: "MENUNGGU PENGAMBILAN", value: "38", icon: FiClock, tone: styles.statBlue },
  { label: "PEMINJAMAN AKTIF", value: "412", icon: FiPackage, tone: styles.statTeal },
  { label: "JATUH TEMPO HARI INI", value: "17", icon: FiAlertTriangle, tone: styles.statOrange },
  { label: "TERLAMBAT", value: "23", icon: FiAlertTriangle, tone: styles.statRed },
  { label: "BUKU HILANG (PROSES)", value: "4", icon: FiBox, tone: styles.statCoral },
  { label: "TOTAL ANGGOTA", value: "1.000", icon: FiUsers, tone: styles.statMember },
  { label: "E-BOOK", value: "620", icon: FiMonitor, tone: styles.statYellow },
];

export default function AdminDashboard() {
  return (
    <div className={styles.content}>
      <section className={styles.infoBanner}>
        <FiInfo size={21} />
        <p>
          Seluruh angka merupakan <strong>Data Contoh</strong> dan bukan statistik resmi Kemenkum Riau.
        </p>
      </section>

      <section className={styles.statsGrid} aria-label="Statistik dashboard admin">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className={`${styles.statCard} ${card.tone}`}>
              <span className={styles.statIcon}>
                <Icon size={24} />
              </span>
              <div>
                <span className={styles.statLabel}>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className={styles.analyticsGrid}>
        <article className={styles.chartCard}>
          <header>
            <h2>Transaksi Peminjaman</h2>
            <p>6 bulan terakhir · Data Contoh</p>
          </header>

          <div className={styles.lineChartWrap} aria-label="Grafik transaksi peminjaman contoh">
            <svg className={styles.lineChart} viewBox="0 0 860 300" role="img" aria-label="Grafik April sampai September">
              <g className={styles.chartGrid}>
                <line x1="48" y1="32" x2="835" y2="32" />
                <line x1="48" y1="94" x2="835" y2="94" />
                <line x1="48" y1="156" x2="835" y2="156" />
                <line x1="48" y1="218" x2="835" y2="218" />
                <line x1="48" y1="280" x2="835" y2="280" />
              </g>
              <g className={styles.chartAxis}>
                <text x="8" y="36">200</text>
                <text x="8" y="98">150</text>
                <text x="8" y="160">100</text>
                <text x="20" y="222">50</text>
                <text x="28" y="284">0</text>
              </g>
              <path
                className={styles.lineDark}
                d="M48 132 C108 112, 150 92, 205 98 S312 130, 365 118 S476 62, 535 54 S650 32, 700 38 S790 48, 835 55"
              />
              <path
                className={styles.lineBlue}
                d="M48 148 C108 125, 150 103, 205 106 S310 136, 365 123 S475 77, 535 69 S648 50, 700 55 S790 70, 835 85"
              />
            </svg>

            <div className={styles.monthLabels} aria-hidden="true">
              <span>Apr</span>
              <span>Mei</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Agu</span>
              <span>Sep</span>
            </div>
          </div>
        </article>

        <article className={styles.memberCard}>
          <header>
            <h2>Kategori Anggota</h2>
            <p>Data Contoh</p>
          </header>

          <div className={styles.donutArea}>
            <div className={styles.donut} aria-label="Diagram kategori anggota contoh" />

            <div className={styles.legend}>
              <div><i className={styles.legendNavy} /><span>Masyarakat Umum</span><strong>540</strong></div>
              <div><i className={styles.legendBlue} /><span>Mahasiswa</span><strong>320</strong></div>
              <div><i className={styles.legendYellow} /><span>Pegawai Internal</span><strong>140</strong></div>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
