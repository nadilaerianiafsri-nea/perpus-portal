"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiClock,
  FiGift,
  FiGrid,
  FiLogOut,
  FiMonitor,
  FiSearch,
  FiSettings,
  FiUser,
  FiUsers,
} from "react-icons/fi";

import styles from "./Dashboard.module.css";

type Role =
  | "admin"
  | "pengunjung";

type DashboardProps = {
  role: Role;
};

type MenuItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{
    size?: number;
  }>;
  badge?: number;
};

const visitorMenu: MenuItem[] = [
  {
    id: "ringkasan",
    label: "Ringkasan",
    icon: FiGrid,
  },
  {
    id: "reservasi",
    label: "Reservasi Saya",
    icon: FiCalendar,
  },
  {
    id: "pinjaman",
    label: "Pinjaman Saya",
    icon: FiBookOpen,
  },
  {
    id: "riwayat",
    label: "Riwayat Peminjaman",
    icon: FiClock,
  },
  {
    id: "ebook",
    label: "E-Book Saya",
    icon: FiMonitor,
  },
  {
    id: "notifikasi",
    label: "Notifikasi",
    icon: FiBell,
    badge: 2,
  },
  {
    id: "profil",
    label: "Profil Saya",
    icon: FiUser,
  },
];

const adminMenu: MenuItem[] = [
  {
    id: "ringkasan",
    label: "Ringkasan",
    icon: FiGrid,
  },
  {
    id: "koleksi",
    label: "Kelola Koleksi",
    icon: FiBookOpen,
  },
  {
    id: "anggota",
    label: "Data Anggota",
    icon: FiUsers,
  },
  {
    id: "reservasi",
    label: "Reservasi",
    icon: FiCalendar,
  },
  {
    id: "peminjaman",
    label: "Peminjaman",
    icon: FiClock,
  },
  {
    id: "hibah",
    label: "Hibah Buku",
    icon: FiGift,
  },
  {
    id: "notifikasi",
    label: "Notifikasi",
    icon: FiBell,
    badge: 2,
  },
  {
    id: "laporan",
    label: "Laporan",
    icon: FiBarChart2,
  },
  {
    id: "pengaturan",
    label: "Pengaturan",
    icon: FiSettings,
  },
];

const descriptions: Record<
  string,
  string
> = {
  ringkasan:
    "Ringkasan aktivitas dan informasi utama perpustakaan.",
  reservasi:
    "Kelola dan lihat status reservasi buku.",
  pinjaman:
    "Lihat buku yang sedang dipinjam.",
  riwayat:
    "Riwayat peminjaman dan pengembalian buku.",
  ebook:
    "Akses koleksi e-book yang tersimpan.",
  notifikasi:
    "Lihat pengingat jatuh tempo dan pemberitahuan layanan.",
  profil:
    "Kelola identitas dan informasi akun.",
  koleksi:
    "Kelola data buku, kategori, dan ketersediaan koleksi.",
  anggota:
    "Kelola data anggota perpustakaan.",
  peminjaman:
    "Kelola transaksi peminjaman dan pengembalian.",
  hibah:
    "Kelola data penerimaan dan status hibah buku.",
  laporan:
    "Lihat ringkasan laporan layanan perpustakaan.",
  pengaturan:
    "Atur konfigurasi layanan dan akun admin.",
};

export default function Dashboard({
  role,
}: DashboardProps) {
  const router = useRouter();

  const menu = useMemo(
    () =>
      role === "admin"
        ? adminMenu
        : visitorMenu,
    [role],
  );

  const [
    active,
    setActive,
  ] = useState("ringkasan");

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const activeItem =
    menu.find(
      (item) =>
        item.id === active,
    ) ?? menu[0];

  const ActiveIcon =
    activeItem.icon;

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await fetch(
        "/api/auth/logout",
        {
          method: "POST",
        },
      );
    } catch {
      // Tetap keluar dari UI.
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  return (
    <main className={styles.page}>
      <aside
        className={styles.sidebar}
      >
        <div
          className={styles.brand}
        >
          <span
            className={
              styles.brandMark
            }
          >
            P
          </span>

          <span>
            <strong>
              Perpustakaan
            </strong>

            <small>
              [LOGO KEMENKUM RIAU]
            </small>
          </span>
        </div>

        <nav className={styles.menu}>
          {menu.map((item) => {
            const Icon =
              item.icon;

            const selected =
              item.id === active;

            return (
              <button
                key={item.id}
                type="button"
                className={
                  selected
                    ? styles.activeMenu
                    : ""
                }
                onClick={() =>
                  setActive(
                    item.id,
                  )
                }
              >
                <Icon size={21} />

                <span>
                  {item.label}
                </span>

                {item.badge ? (
                  <b>
                    {item.badge}
                  </b>
                ) : null}
              </button>
            );
          })}
        </nav>

        <button
          type="button"
          className={
            styles.logout
          }
          onClick={handleLogout}
          disabled={loggingOut}
        >
          <FiLogOut size={21} />

          <span>
            {loggingOut
              ? "Keluar..."
              : "Keluar"}
          </span>
        </button>
      </aside>

      <section
        className={styles.content}
      >
        <div
          className={
            styles.breadcrumb
          }
        >
          Beranda <span>/</span>{" "}
          {role === "admin"
            ? "Dashboard Admin"
            : "Dashboard Pengunjung"}
        </div>

        <section
          className={styles.hero}
        >
          <span>
            ✦ Selamat datang,{" "}
            {role === "admin"
              ? "Admin"
              : "Anggota"}
          </span>

          <h1>
            Halo,{" "}
            {role === "admin"
              ? "Admin Perpustakaan"
              : "Pemustaka"}
            !
          </h1>

          <p>
            {role === "admin"
              ? "Kelola layanan perpustakaan dari satu dashboard yang terorganisasi."
              : "Perpustakaan ada dalam genggaman Anda. Lanjutkan aktivitas membaca dan layanan Anda dari sini."}
          </p>

          <button
            type="button"
            onClick={() =>
              setActive(
                role === "admin"
                  ? "koleksi"
                  : "reservasi",
              )
            }
          >
            <FiSearch size={20} />

            {role === "admin"
              ? "Kelola Koleksi"
              : "Cari Koleksi"}
          </button>
        </section>

        <section
          className={styles.panel}
        >
          <div
            className={
              styles.panelIcon
            }
          >
            <ActiveIcon
              size={27}
            />
          </div>

          <div>
            <small>
              {role === "admin"
                ? "ADMIN"
                : "ANGGOTA"}
            </small>

            <h2>
              {activeItem.label}
            </h2>

            <p>
              {
                descriptions[
                  activeItem.id
                ]
              }
            </p>
          </div>
        </section>

        <div
          className={styles.cards}
        >
          <article>
            <FiBookOpen />

            <strong>
              {role === "admin"
                ? "1.248"
                : "3"}
            </strong>

            <span>
              {role === "admin"
                ? "Total Koleksi"
                : "Pinjaman Aktif"}
            </span>
          </article>

          <article>
            <FiCalendar />

            <strong>
              {role === "admin"
                ? "26"
                : "1"}
            </strong>

            <span>
              {role === "admin"
                ? "Reservasi Aktif"
                : "Reservasi Saya"}
            </span>
          </article>

          <article>
            <FiBell />
            <strong>2</strong>
            <span>
              Notifikasi Baru
            </span>
          </article>
        </div>
      </section>
    </main>
  );
}
