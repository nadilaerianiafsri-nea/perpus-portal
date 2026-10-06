"use client";

import type { ComponentType, FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FiBarChart2,
  FiBell,
  FiBookOpen,
  FiChevronDown,
  FiGift,
  FiGrid,
  FiHome,
  FiLogOut,
  FiRepeat,
  FiSearch,
  FiSettings,
  FiUsers,
} from "react-icons/fi";

import styles from "./Admin.module.css";

type AdminShellProps = {
  children: ReactNode;
  user: {
    name: string;
    email: string;
  };
};

type MenuItem = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  expandable?: boolean;
  route?: string;
};

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: FiGrid, route: "/admin" },
  { id: "koleksi", label: "Koleksi", icon: FiBookOpen, expandable: true },
  { id: "keanggotaan", label: "Keanggotaan", icon: FiUsers, expandable: true },
  { id: "transaksi", label: "Transaksi", icon: FiRepeat, expandable: true },
  { id: "hibah", label: "Hibah Buku", icon: FiGift },
  { id: "notifikasi", label: "Notifikasi", icon: FiBell },
  { id: "laporan", label: "Laporan", icon: FiBarChart2 },
  { id: "pengaturan", label: "Pengaturan Perpustakaan", icon: FiSettings },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AP";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AP";
}

export default function AdminShell({ children, user }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const currentTitle = useMemo(() => {
    if (pathname === "/admin") return "Dashboard";
    if (pathname.startsWith("/admin/koleksi")) return "Koleksi";
    if (pathname.startsWith("/admin/keanggotaan")) return "Keanggotaan";
    if (pathname.startsWith("/admin/transaksi")) return "Transaksi";
    if (pathname.startsWith("/admin/hibah")) return "Hibah Buku";
    if (pathname.startsWith("/admin/notifikasi")) return "Notifikasi";
    if (pathname.startsWith("/admin/laporan")) return "Laporan";
    if (pathname.startsWith("/admin/pengaturan")) return "Pengaturan Perpustakaan";
    return "Dashboard";
  }, [pathname]);

  function handleMenuClick(item: MenuItem) {
    if (item.route) {
      router.push(item.route);
      return;
    }

    if (item.expandable) {
      setOpenMenu((current) => (current === item.id ? null : item.id));
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <main className={styles.adminPage}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>P</span>
          <div className={styles.brandText}>
            <strong>Perpustakaan</strong>
            <small>[LOGO KEMENKUM RIAU]</small>
          </div>
        </div>

        <nav className={styles.menu} aria-label="Menu admin perpustakaan">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const selected = item.route ? pathname === item.route : pathname.startsWith(`/admin/${item.id}`);
            const expanded = openMenu === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={selected ? styles.menuActive : undefined}
                aria-current={selected ? "page" : undefined}
                aria-expanded={item.expandable ? expanded : undefined}
                onClick={() => handleMenuClick(item)}
              >
                <Icon size={20} />
                <span>{item.label}</span>
                {item.expandable ? (
                  <FiChevronDown
                    size={17}
                    className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}
                  />
                ) : null}
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <button type="button" onClick={() => router.push("/")}>
            <FiHome size={19} />
            <span>Lihat Situs Publik</span>
          </button>

          <button type="button" onClick={handleLogout} disabled={loggingOut}>
            <FiLogOut size={19} />
            <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
          </button>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.pageTitle}>
            <span>Admin Perpustakaan</span>
            <h1>{currentTitle}</h1>
          </div>

          <div className={styles.topbarActions}>
            <form className={styles.searchBox} onSubmit={handleSearch}>
              <FiSearch size={20} />
              <input
                aria-label="Cari buku cepat"
                type="search"
                placeholder="Cari buku cepat..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </form>
            <span className={styles.avatar} title={`${user.name} · ${user.email}`}>
              {initials(user.name)}
            </span>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
