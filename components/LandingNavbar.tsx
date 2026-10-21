"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type NavbarProps = {
  active?:
    | "beranda"
    | "koleksi"
    | "ebook"
    | "hibah"
    | "tentang"
    | "panduan"
    | "faq"
    | "kontak";
  user?: { name: string; role: "ADMIN" | "PENGUNJUNG" } | null;
};

export default function LandingNavbar({
  active = "beranda",
  user,
}: NavbarProps) {
  const mobileMenuRef = useRef<HTMLDetailsElement>(null);

  const links = [
    ["Beranda", "/", "beranda"],
    ["Koleksi", "/koleksi", "koleksi"],
    ["E-Book", "/e-book", "ebook"],
    ["Hibah Buku", "/hibah-buku", "hibah"],
    ["Tentang", "/tentang", "tentang"],
    ["Panduan", "/panduan", "panduan"],
    ["FAQ", "/faq", "faq"],
    ["Kontak", "/kontak", "kontak"],
  ];

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const mobileMenu = mobileMenuRef.current;

      if (!mobileMenu?.open) {
        return;
      }

      if (event.target instanceof Node && !mobileMenu.contains(event.target)) {
        mobileMenu.open = false;
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const actions = user ? (
    <Link data-button="primary" data-button-size="md" data-button-shape="pill"
      className="member-btn"
      href={user.role === "ADMIN" ? "/admin" : "/dashboard"}
    >
      Dashboard Saya
    </Link>
  ) : (
    <>
      <Link data-button="ghost" data-button-size="md" data-button-shape="pill" className="login-link" href="/login">
        Masuk
      </Link>
      <Link data-button="primary" data-button-size="md" data-button-shape="pill" className="member-btn" href="/register">
        Daftar Anggota
      </Link>
    </>
  );

  return (
    <header
      className="site-header"
      style={{ position: "fixed", inset: "0 0 auto 0", width: "100%" }}
    >
      <div className="landing-shell top-nav">
        <Link className="wordmark" href="/" aria-label="Beranda Perpustakaan">
          <span className="wordmark-box">P</span>
        </Link>

        <nav className="main-nav" aria-label="Navigasi utama">
          {links.map(([label, href, key]) => (
            <Link
              key={key}
              href={href}
              className={active === key ? "nav-active" : undefined}
              aria-current={active === key ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">{actions}</div>

        <details className="mobile-menu" ref={mobileMenuRef}>
          <summary aria-label="Buka menu">
            <span />
            <span />
            <span />
          </summary>

          <div>
            {links.map(([label, href, key]) => (
              <Link
                key={key}
                href={href}
                className={active === key ? "nav-active" : undefined}
                aria-current={active === key ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
            {actions}
          </div>
        </details>
      </div>
    </header>
  );
}
