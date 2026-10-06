"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FiBell, FiBookOpen, FiCalendar, FiClock, FiGrid, FiLogOut, FiMenu, FiMonitor, FiSearch, FiUser, FiX } from "react-icons/fi";
import type { CurrentUser } from "@/auth/serverAuth";
import { useMemberResource } from "./api";
import { MemberContext } from "./MemberContext";
import MemberRightPanel from "./MemberRightPanel";
import type { MemberSummary } from "./types";
import { initials } from "./format";
import styles from "./Members.module.css";

const navigation = [
  { href: "/dashboard", label: "Ringkasan", icon: FiGrid },
  { href: "/dashboard/reservasi", label: "Reservasi Saya", icon: FiCalendar },
  { href: "/dashboard/pinjaman", label: "Pinjaman Saya", icon: FiBookOpen },
  { href: "/dashboard/riwayat", label: "Riwayat Peminjaman", icon: FiClock },
  { href: "/dashboard/e-book", label: "E-Book Saya", icon: FiMonitor },
  { href: "/dashboard/notifikasi", label: "Notifikasi", icon: FiBell },
  { href: "/dashboard/profil", label: "Profil Saya", icon: FiUser },
];

export default function MemberShell({ user, children }: { user: CurrentUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const circulationPage = pathname === "/dashboard/reservasi" || pathname === "/dashboard/pinjaman";
  const router = useRouter();
  const resource = useMemberResource<MemberSummary>("dashboard");
  const { reload } = resource;
  const [drawer, setDrawer] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const previousPath = useRef(pathname);
  const current = navigation.find(item => item.href === pathname) ?? navigation[0];
  const name = resource.data?.currentUser.name ?? user.name;
  const unread = resource.data?.unreadNotifications;

  useEffect(() => {
    // Browser history can restore the whole document without running server auth.
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
    if (previousPath.current !== pathname) { previousPath.current = pathname; void reload(); }
  }, [pathname, reload]);
  useEffect(() => {
    if (drawer) dialog.current?.showModal();
    else if (dialog.current?.open) { dialog.current.close(); menuButton.current?.focus(); }
    const onResize = () => { if (window.innerWidth > 900) setDrawer(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [drawer]);

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true); setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      window.location.replace("/login");
    } catch { setLogoutError("Keluar belum berhasil. Silakan coba lagi."); setLoggingOut(false); }
  }
  function sidebar(mobile = false) {
    return <><Link className={styles.brand} href="/" onClick={() => setDrawer(false)}><span>P</span><div><strong>Perpustakaan</strong><small>KEMENKUM RIAU</small></div></Link>
      {mobile && <button className={`${styles.iconButton} ${styles.drawerClose}`} aria-label="Tutup menu" onClick={() => setDrawer(false)}><FiX /></button>}
      <nav className={styles.navigation} aria-label="Navigasi anggota">{navigation.map(item => <Link key={item.href} href={item.href} onClick={() => setDrawer(false)} className={pathname === item.href ? styles.activeNav : ""} aria-current={pathname === item.href ? "page" : undefined}><item.icon aria-hidden /><span>{item.label}</span>{item.href.endsWith("notifikasi") && unread !== undefined && unread > 0 && <b className={styles.notificationBadge}>{unread}</b>}</Link>)}</nav>
      <div className={styles.sidebarBottom}>{logoutError && <p className={styles.formError} role="alert">{logoutError}</p>}<button onClick={logout} disabled={loggingOut}><FiLogOut aria-hidden />{loggingOut ? "Sedang keluar..." : "Keluar"}</button></div></>;
  }

  return <MemberContext.Provider value={{ user, summary: resource.data, loading: resource.loading, error: resource.error, refresh: resource.reload }}><div className={`${styles.shell} ${circulationPage ? styles.circulationShell : ""}`}>
    <a className={styles.skipLink} href="#member-content">Lewati ke konten</a>
    <aside className={styles.sidebar}>{sidebar()}</aside>
    <dialog ref={dialog} className={styles.drawer} aria-label="Menu anggota" onCancel={() => setDrawer(false)} onClick={event => { if (event.target === event.currentTarget) setDrawer(false); }}>{sidebar(true)}</dialog>
    <div className={styles.workspace}><header className={styles.topbar}>
      <button ref={menuButton} className={`${styles.iconButton} ${styles.menuButton}`} aria-label="Buka menu anggota" aria-expanded={drawer} onClick={() => setDrawer(true)}><FiMenu /></button>
      <nav aria-label="Breadcrumb" className={styles.breadcrumb}><Link href="/">Beranda</Link><span>/</span><Link href="/dashboard">Dashboard</Link><span>/</span><strong>{current.label}</strong></nav>
      <div className={styles.topActions}><form role="search" className={styles.search} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); router.push(`/koleksi?search=${encodeURIComponent(String(form.get("search") ?? "").trim())}`); }}><button aria-label="Cari koleksi" type="submit"><FiSearch /></button><input name="search" aria-label="Cari koleksi" placeholder="Cari koleksi..." /></form>
        <Link href="/dashboard/notifikasi" className={styles.iconButton} aria-label={`Notifikasi${unread !== undefined ? `, ${unread} belum dibaca` : ""}`}><FiBell />{unread !== undefined && unread > 0 && <span className={styles.bellDot} />}</Link>
        <Link className={styles.avatar} href="/dashboard/profil" aria-label="Profil saya">{initials(name)}</Link></div>
    </header><div className={styles.contentGrid}><main id="member-content" className={styles.main} tabIndex={-1}>{children}</main>{!circulationPage && <MemberRightPanel />}</div></div>
  </div></MemberContext.Provider>;
}
