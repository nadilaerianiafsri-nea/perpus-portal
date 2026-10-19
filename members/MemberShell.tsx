"use client";

import { ButtonLabel } from '@/components/Button';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  FiBell,
  FiBookOpen,
  FiCalendar,
  FiGrid,
  FiLogOut,
  FiMenu,
  FiMonitor,
  FiSearch,
  FiUser,
  FiX,
} from "react-icons/fi";
import type { CurrentUser } from "@/auth/serverAuth";
import { useMemberResource } from "./api";
import { MemberContext } from "./MemberContext";
import MemberRightPanel from "./MemberRightPanel";
import type { MemberSummary } from "./types";
import { initials } from "./format";
import styles from "./Members.module.css";

const navigation = [
  { href: "/dashboard", label: "Ringkasan", icon: FiGrid },
  { href: "/dashboard/koleksi", label: "Koleksi", icon: FiBookOpen },
  { href: "/dashboard/reservasi", label: "Reservasi Saya", icon: FiCalendar },
  { href: "/dashboard/pinjaman", label: "Pinjaman Saya", icon: FiBookOpen },
  { href: "/dashboard/e-book", label: "E-Book Saya", icon: FiMonitor },
  { href: "/dashboard/notifikasi", label: "Notifikasi", icon: FiBell },
  { href: "/dashboard/profil", label: "Profil Saya", icon: FiUser },
];

function currentNavigation(pathname: string) {
  return (
    navigation.find(
      (item) =>
        item.href !== "/dashboard" &&
        (pathname === item.href || pathname.startsWith(`${item.href}/`)),
    ) ?? navigation[0]
  );
}

export default function MemberShell({
  user,
  children,
}: {
  user: CurrentUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const circulationPage = [
    "/dashboard/reservasi",
    "/dashboard/pinjaman",
    "/dashboard/e-book",
  ].includes(pathname) || pathname.startsWith("/dashboard/koleksi");
  const router = useRouter();
  const resource = useMemberResource<MemberSummary>("dashboard");
  const { reload } = resource;
  const [drawer, setDrawer] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const previousPath = useRef(pathname);
  const current = currentNavigation(pathname);
  const name = resource.data?.currentUser.name ?? user.name;
  const unread = resource.data?.unreadNotifications;

  useEffect(() => {
    const restored = (event: PageTransitionEvent) => {
      if (event.persisted) {
        document.documentElement.style.visibility = "hidden";
        window.location.reload();
      }
    };
    window.addEventListener("pageshow", restored);
    return () => window.removeEventListener("pageshow", restored);
  }, []);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      void reload();
    }
  }, [pathname, reload]);

  useEffect(() => {
    if (drawer) dialog.current?.showModal();
    else if (dialog.current?.open) {
      dialog.current.close();
      menuButton.current?.focus();
    }
    const onResize = () => {
      if (window.innerWidth > 900) setDrawer(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawer]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.replace("/login");
    } catch {
      setLogoutError("Keluar belum berhasil. Silakan coba lagi.");
      setLoggingOut(false);
    }
  }

  function sidebar(mobile = false) {
    return (
      <>
        <Link className={styles.brand} href="/" onClick={() => setDrawer(false)}>
          <span>P</span>
          <div>
            <strong>Perpustakaan</strong>
            <small>KEMENKUM RIAU</small>
          </div>
        </Link>

        {mobile ? (
          <button
            data-button="icon"
            data-button-shape="square"
            className={`${styles.iconButton} ${styles.drawerClose}`}
            aria-label="Tutup menu"
            onClick={() => setDrawer(false)}
          >
            <FiX />
          </button>
        ) : null}

        <nav className={styles.navigation} aria-label="Navigasi anggota">
          {navigation.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setDrawer(false)}
                className={active ? styles.activeNav : ""}
                aria-current={active ? "page" : undefined}
              >
                <item.icon aria-hidden />
                <span>{item.label}</span>
                {item.href.endsWith("notifikasi") && unread !== undefined && unread > 0 ? (
                  <b className={styles.notificationBadge}>{unread}</b>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarBottom}>
          {logoutError ? (
            <p className={styles.formError} role="alert">
              {logoutError}
            </p>
          ) : null}
          <button data-button="ghost" data-button-loading={loggingOut} aria-busy={loggingOut} onClick={logout} disabled={loggingOut}>
            <FiLogOut aria-hidden />
            <ButtonLabel loading={loggingOut} pending="Sedang keluar...">Keluar</ButtonLabel>
          </button>
        </div>
      </>
    );
  }

  return (
    <MemberContext.Provider
      value={{
        user,
        summary: resource.data,
        loading: resource.loading,
        error: resource.error,
        refresh: resource.reload,
      }}
    >
      <div className={`${styles.shell} ${circulationPage ? styles.circulationShell : ""}`}>
        <a className={styles.skipLink} href="#member-content">
          Lewati ke konten
        </a>
        <aside className={styles.sidebar}>{sidebar()}</aside>
        <dialog
          ref={dialog}
          className={styles.drawer}
          aria-label="Menu anggota"
          onCancel={() => setDrawer(false)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setDrawer(false);
          }}
        >
          {sidebar(true)}
        </dialog>

        <div className={styles.workspace}>
          <header className={styles.topbar}>
            <button
              data-button="icon"
              data-button-shape="square"
              ref={menuButton}
              className={`${styles.iconButton} ${styles.menuButton}`}
              aria-label="Buka menu anggota"
              aria-expanded={drawer}
              onClick={() => setDrawer(true)}
            >
              <FiMenu />
            </button>

            <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
              <Link href="/">Beranda</Link>
              <span>/</span>
              <Link href="/dashboard">Dashboard</Link>
              <span>/</span>
              <strong>{current.label}</strong>
            </nav>

            <div className={styles.topActions}>
              <form
                role="search"
                className={styles.search}
                onSubmit={(event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  router.push(
                    `/dashboard/koleksi?search=${encodeURIComponent(String(form.get("search") ?? "").trim())}`,
                  );
                }}
              >
                <button data-button="icon" data-button-size="sm" data-button-shape="square" aria-label="Cari koleksi" type="submit">
                  <FiSearch />
                </button>
                <input name="search" aria-label="Cari koleksi" placeholder="Cari koleksi..." />
              </form>

              <Link
                data-button="icon"
                data-button-shape="pill"
                href="/dashboard/notifikasi"
                className={styles.iconButton}
                aria-label={`Notifikasi${unread !== undefined ? `, ${unread} belum dibaca` : ""}`}
              >
                <FiBell />
                {unread !== undefined && unread > 0 ? (
                  <span className={styles.bellDot} />
                ) : null}
              </Link>
              <Link className={styles.avatar} href="/dashboard/profil" aria-label="Profil saya">
                {initials(name)}
              </Link>
            </div>
          </header>

          <div className={styles.contentGrid}>
            <main id="member-content" className={styles.main} tabIndex={-1}>
              {children}
            </main>
            {!circulationPage ? <MemberRightPanel /> : null}
          </div>
        </div>
      </div>
    </MemberContext.Provider>
  );
}
