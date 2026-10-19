"use client";

import Link from "next/link";
import type { ComponentType, FormEvent, ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  FiMenu,
  FiRepeat,
  FiSearch,
  FiSettings,
  FiUsers,
  FiX,
} from "react-icons/fi";

import styles from "./Admin.module.css";
import enhancements from "./AdminEnhancements.module.css";

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
  icon: ComponentType<{
    size?: number;
    className?: string;
  }>;
  route?: string;
  children?: SubMenuItem[];
};

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", icon: FiGrid, route: "/admin" },
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
      { label: "Reservasi", route: "/admin/transaksi/reservasi" },
      { label: "Peminjaman", route: "/admin/transaksi/peminjaman" },
      { label: "Pengembalian", route: "/admin/transaksi/pengembalian" },
      { label: "Sirkulasi E-Book", route: "/admin/transaksi/e-book" },
      {
        label: "Buku Hilang & Penggantian",
        route: "/admin/transaksi/buku-hilang-penggantian",
      },
    ],
  },
  { id: "hibah-buku", label: "Hibah Buku", icon: FiGift, route: "/admin/hibah-buku" },
  { id: "notifikasi", label: "Notifikasi", icon: FiBell, route: "/admin/notifikasi" },
  { id: "laporan", label: "Laporan", icon: FiBarChart2, route: "/admin/laporan" },
  {
    id: "pengaturan",
    label: "Pengaturan Perpustakaan",
    icon: FiSettings,
    route: "/admin/pengaturan",
  },
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "AP";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "AP";
}

function routeMatches(pathname: string, route: string) {
  if (route === "/admin") return pathname === route;
  return pathname === route || pathname.startsWith(`${route}/`);
}

function currentPageTitle(pathname: string) {
  if (routeMatches(pathname, "/admin/profil")) return "Profil Admin";
  for (const item of menuItems) {
    if (item.route && routeMatches(pathname, item.route)) return item.label;
    const child = item.children?.find((entry) => routeMatches(pathname, entry.route));
    if (child) return child.label;
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
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const closeMenuButton = useRef<HTMLButtonElement>(null);
  const sidebar = useRef<HTMLElement>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const currentTitle = useMemo(() => currentPageTitle(pathname), [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 901px)");
    const resized = () => {
      if (desktop.matches) setMobileMenuOpen(false);
    };
    desktop.addEventListener("change", resized);
    return () => desktop.removeEventListener("change", resized);
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const trigger = menuTrigger.current;
    closeMenuButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMobileMenuOpen(false);
      } else if (event.key === "Tab") {
        const controls = Array.from(sidebar.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled])',
        ) ?? []).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (trigger?.getClientRects().length) trigger.focus();
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const controller = new AbortController();

    const loadUnreadNotifications = () => {
      fetch("/api/members/admin/operations/notifications/unread-count", {
        cache: "no-store",
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) throw new Error();
          return (await response.json()) as { unread?: number };
        })
        .then((payload) => {
          if (!controller.signal.aborted) {
            setUnreadNotifications(
              Number.isSafeInteger(payload.unread) && (payload.unread ?? 0) > 0
                ? payload.unread!
                : 0,
            );
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setUnreadNotifications(0);
        });
    };

    loadUnreadNotifications();
    const interval = window.setInterval(loadUnreadNotifications, 15000);
    window.addEventListener("focus", loadUnreadNotifications);

    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", loadUnreadNotifications);
    };
  }, [pathname]);

  function toggleMenu(item: MenuItem) {
    if (!item.children) return;
    setOpenMenu((current) => (current === item.id ? null : item.id));
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
        ref={sidebar}
        id="admin-sidebar"
        role={mobileMenuOpen ? "dialog" : undefined}
        aria-modal={mobileMenuOpen || undefined}
        aria-label="Menu admin"
        className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}
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
          {mobileMenuOpen ? <button
            ref={closeMenuButton}
            data-button="ghost"
            data-button-size="sm"
            data-button-shape="square"
            type="button"
            className={styles.sidebarClose}
            aria-label="Tutup menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <FiX size={20} />
          </button> : null}
        </div>

        <nav className={styles.menu} aria-label="Menu admin perpustakaan">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isRouteActive = item.route ? routeMatches(pathname, item.route) : false;
            const isGroupActive =
              item.children?.some((child) => routeMatches(pathname, child.route)) ?? false;
            const expanded = openMenu === item.id || (openMenu === null && isGroupActive);

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
                  {item.id === "notifikasi" && unreadNotifications > 0 ? (
                    <b
                      className={`${enhancements.notificationBadge} ${enhancements.menuNotificationBadge}`}
                    >
                      {unreadNotifications}
                    </b>
                  ) : null}
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
                    className={`${styles.chevron} ${expanded ? styles.chevronOpen : ""}`}
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
          <button data-button="danger" data-button-size="md" data-button-loading={loggingOut} type="button" onClick={handleLogout} disabled={loggingOut}>
            <FiLogOut size={18} />
            <span>{loggingOut ? "Keluar..." : "Keluar"}</span>
          </button>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            <button
              ref={menuTrigger}
              data-button="icon"
              data-button-size="sm"
              data-button-shape="square"
              type="button"
              className={styles.mobileMenuButton}
              aria-label="Buka menu admin"
              aria-expanded={mobileMenuOpen}
              aria-controls="admin-sidebar"
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
              <button data-button="icon" data-button-size="sm" data-button-shape="square" type="submit" aria-label="Cari koleksi">
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
              data-button="icon"
              data-button-size="sm"
              data-button-shape="square"
              href="/admin/notifikasi"
              className={styles.iconButton}
              aria-label={`Notifikasi admin${unreadNotifications ? `, ${unreadNotifications} belum dibaca` : ""}`}
              onClick={() => setOpenMenu(null)}
            >
              <FiBell size={18} />
              {unreadNotifications > 0 ? (
                <b
                  className={`${enhancements.notificationBadge} ${enhancements.bellNotificationBadge}`}
                >
                  {unreadNotifications}
                </b>
              ) : null}
            </Link>
            <Link
              href="/admin/profil"
              className={`${styles.avatar} ${enhancements.profileTrigger}`}
              title={`${user.name} · ${user.email}`}
              aria-label="Buka profil admin"
              aria-current={pathname === "/admin/profil" ? "page" : undefined}
              onClick={() => setOpenMenu(null)}
            >
              {initials(user.name)}
            </Link>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}
