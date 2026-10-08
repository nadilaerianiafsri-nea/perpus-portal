"use client";

import Link from "next/link";
import type { ComponentType, FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  FiBell,
  FiBookOpen,
  FiChevronDown,
  FiGift,
  FiGrid,
  FiHome,
  FiLogOut,
  FiMenu,
  FiRepeat,
  FiSearch,
  FiUsers,
  FiX,
} from "react-icons/fi";

import styles from "./Admin.module.css";

type AdminShellProps = {
  children: ReactNode;
  user: {
    name: string;
    email: string;
  };
};

type SubMenuItem = {
  label: string;
  route: string;
};

type MenuItem = {
  id: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  route?: string;
  children?: SubMenuItem[];
};

const menuItems: MenuItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: FiGrid,
    route: "/admin",
  },
  {
    id: "koleksi",
    label: "Koleksi",
    icon: FiBookOpen,
    children: [
      { label: "Data Buku", route: "/admin/koleksi/data-buku" },
      { label: "E-Book", route: "/admin/koleksi/e-book" },
    ],
  },
  {
    id: "keanggotaan",
    label: "Keanggotaan",
    icon: FiUsers,
    route: "/admin/keanggotaan",
  },
  {
    id: "transaksi",
    label: "Transaksi",
    icon: FiRepeat,
    children: [
      {
        label: "Reservasi 24 Jam",
        route: "/admin/transaksi/reservasi-24-jam",
      },
      {
        label: "Peminjaman Aktif",
        route: "/admin/transaksi/peminjaman-aktif",
      },
      {
        label: "Pengembalian",
        route: "/admin/transaksi/pengembalian",
      },
      {
        label: "Perpanjangan",
        route: "/admin/transaksi/perpanjangan",
      },
      {
        label: "Terlambat",
        route: "/admin/transaksi/terlambat",
      },
      {
        label: "Buku Hilang & Penggantian",
        route: "/admin/transaksi/buku-hilang-penggantian",
      },
    ],
  },
  {
    id: "hibah-buku",
    label: "Hibah Buku",
    icon: FiGift,
    route: "/admin/hibah-buku",
  },
  {
    id: "notifikasi",
    label: "Notifikasi",
    icon: FiBell,
    children: [
      {
        label: "Reminder",
        route: "/admin/notifikasi/reminder",
      },
      {
        label: "Log Email",
        route: "/admin/notifikasi/log-email",
      },
      {
        label: "Log WhatsApp",
        route: "/admin/notifikasi/log-whatsapp",
      },
    ],
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (!parts.length) {
    return "AP";
  }

  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "AP"
  );
}

function routeMatches(pathname: string, route: string) {
  if (route === "/admin") return pathname === route;
  return pathname === route || pathname.startsWith(`${route}/`);
}

function currentPageTitle(pathname: string) {
  for (const item of menuItems) {
    if (item.route && routeMatches(pathname, item.route)) {
      return item.label;
    }

    const child = item.children?.find((entry) =>
      routeMatches(pathname, entry.route),
    );

    if (child) {
      return child.label;
    }
  }

  return "Dashboard";
}

export default function AdminShell({ children, user }: AdminShellProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [loggingOut, setLoggingOut] = useState(false);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentTitle = useMemo(() => currentPageTitle(pathname), [pathname]);

  function toggleMenu(item: MenuItem) {
    if (!item.children) {
      return;
    }

    setOpenMenu((current) => (current === item.id ? null : item.id));
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      router.replace("/login");
      router.refresh();
      setLoggingOut(false);
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const keyword = search.trim();

    const target = keyword
      ? `/admin/koleksi/data-buku?search=${encodeURIComponent(keyword)}`
      : "/admin/koleksi/data-buku";

    setOpenMenu("koleksi");
    router.push(target);
  }

  return (
    <main className={styles.adminPage}>
      {mobileMenuOpen ? (
        <button
          type="button"
          className={styles.sidebarOverlay}
          aria-label="Tutup menu admin"
          onClick={() => setMobileMenuOpen(false)}
        />
      ) : null}

      <aside
        className={`${styles.sidebar} ${
          mobileMenuOpen ? styles.sidebarOpen : ""
        }`}
      >
        <div className={styles.brandRow}>
          <Link
            href="/admin"
            className={styles.brand}
            onClick={() => {
              setOpenMenu(null);
              setMobileMenuOpen(false);
            }}
          >
            <span className={styles.brandMark}>P</span>

            <div className={styles.brandText}>
              <strong>Perpustakaan</strong>
              <small>KEMENKUM RIAU</small>
            </div>
          </Link>

          <button
            type="button"
            className={styles.sidebarClose}
            aria-label="Tutup menu admin"
            onClick={() => setMobileMenuOpen(false)}
          >
            <FiX size={20} />
          </button>
        </div>

        <nav className={styles.menu} aria-label="Menu admin perpustakaan">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isRouteActive = item.route
              ? routeMatches(pathname, item.route)
              : false;
            const isGroupActive = item.children?.some((child) =>
              routeMatches(pathname, child.route),
            );
            const expanded =
              openMenu === item.id || (openMenu === null && isGroupActive);

            if (item.route) {
              return (
                <Link
                  key={item.id}
                  href={item.route}
                  className={isRouteActive ? styles.menuActive : undefined}
                  aria-current={isRouteActive ? "page" : undefined}
                  onClick={() => {
                    setOpenMenu(null);
                    setMobileMenuOpen(false);
                  }}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <div key={item.id} className={styles.menuGroup}>
                <button
                  type="button"
                  className={isGroupActive ? styles.menuGroupActive : undefined}
                  aria-expanded={expanded}
                  onClick={() => toggleMenu(item)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>

                  <FiChevronDown
                    size={16}
                    className={`${styles.chevron} ${
                      expanded ? styles.chevronOpen : ""
                    }`}
                  />
                </button>

                {expanded ? (
                  <div className={styles.subMenu}>
                    {item.children?.map((child) => {
                      const active = routeMatches(pathname, child.route);

                      return (
                        <Link
                          key={child.route}
                          href={child.route}
                          className={active ? styles.subMenuActive : undefined}
                          aria-current={active ? "page" : undefined}
                          onClick={() => {
                            setOpenMenu(item.id);
                            setMobileMenuOpen(false);
                          }}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          <Link href="/" onClick={() => setMobileMenuOpen(false)}>
            <FiHome size={18} />
            <span>Lihat Situs Publik</span>
          </Link>

          <button type="button" onClick={handleLogout} disabled={loggingOut}>
            <FiLogOut size={18} />
            <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
          </button>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              aria-label="Buka menu admin"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
            >
              <FiMenu size={20} />
            </button>

            <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
              <Link href="/">Beranda</Link>
              <span>/</span>
              <Link href="/admin" onClick={() => setOpenMenu(null)}>
                Dashboard
              </Link>

              {pathname !== "/admin" ? (
                <>
                  <span>/</span>
                  <strong>{currentTitle}</strong>
                </>
              ) : null}
            </nav>
          </div>

          <div className={styles.topbarActions}>
            <form className={styles.searchBox} onSubmit={handleSearch}>
              <button type="submit" aria-label="Cari koleksi">
                <FiSearch size={17} />
              </button>

              <input
                aria-label="Cari koleksi"
                type="search"
                name="search"
                placeholder="Cari koleksi..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </form>

            <Link
              href="/admin/notifikasi/reminder"
              className={styles.iconButton}
              aria-label="Notifikasi admin"
              onClick={() => setOpenMenu("notifikasi")}
            >
              <FiBell size={18} />
            </Link>

            <span
              className={styles.avatar}
              title={`${user.name} · ${user.email}`}
            >
              {initials(user.name)}
            </span>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
