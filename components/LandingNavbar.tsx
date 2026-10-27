"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  type MouseEvent,
} from "react";
import {
  getPublicNavigationDirection,
  type PublicNavKey,
} from "./publicNavigation";

type NavbarProps = {
  active?: PublicNavKey;
  user?: {
    name: string;
    role: "ADMIN" | "PENGUNJUNG";
  } | null;
};

const links: Array<
  [label: string, href: string, key: PublicNavKey]
> = [
  ["Beranda", "/", "beranda"],
  ["Koleksi", "/koleksi", "koleksi"],
  ["Hibah Buku", "/hibah-buku", "hibah"],
  ["Tentang", "/tentang", "tentang"],
  ["Panduan", "/panduan", "panduan"],
  ["FAQ", "/faq", "faq"],
  ["Kontak", "/kontak", "kontak"],
];

export default function LandingNavbar({
  active = "beranda",
  user,
}: NavbarProps) {
  const mobileMenuRef =
    useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const handlePointerDown = (
      event: PointerEvent,
    ) => {
      const mobileMenu =
        mobileMenuRef.current;

      if (!mobileMenu?.open) return;

      if (
        event.target instanceof Node &&
        !mobileMenu.contains(event.target)
      ) {
        mobileMenu.open = false;
      }
    };

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
    );

    return () =>
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
      );
  }, []);

  function preparePublicTransition(
    event: MouseEvent<HTMLAnchorElement>,
    target: PublicNavKey,
  ) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const direction =
      getPublicNavigationDirection(
        active,
        target,
      );

    if (direction) {
      sessionStorage.setItem(
        "public-nav-direction",
        direction,
      );
    } else {
      sessionStorage.removeItem(
        "public-nav-direction",
      );
    }
  }

  const actions = user ? (
    <Link
      data-button="primary"
      data-button-size="md"
      data-button-shape="pill"
      className="member-btn"
      href={
        user.role === "ADMIN"
          ? "/admin"
          : "/dashboard"
      }
    >
      Dashboard Saya
    </Link>
  ) : (
    <>
      <Link
        data-button="ghost"
        data-button-size="md"
        data-button-shape="pill"
        className="login-link"
        href="/login"
      >
        Masuk
      </Link>

      <Link
        data-button="primary"
        data-button-size="md"
        data-button-shape="pill"
        className="member-btn"
        href="/register"
      >
        Daftar Anggota
      </Link>
    </>
  );

  return (
    <header
      className="site-header"
      style={{
        position: "fixed",
        inset: "0 0 auto 0",
        width: "100%",
      }}
    >
      <div className="landing-shell top-nav">
        <Link
          className="wordmark"
          href="/"
          aria-label="Beranda Perpustakaan"
          onClick={(event) =>
            preparePublicTransition(
              event,
              "beranda",
            )
          }
        >
          <span className="wordmark-box">
            P
          </span>
        </Link>

        <nav
          className="main-nav"
          aria-label="Navigasi utama"
        >
          {links.map(
            ([label, href, key]) => (
              <Link
                key={key}
                href={href}
                className={
                  active === key
                    ? "nav-active"
                    : undefined
                }
                aria-current={
                  active === key
                    ? "page"
                    : undefined
                }
                onClick={(event) =>
                  preparePublicTransition(
                    event,
                    key,
                  )
                }
              >
                {label}
              </Link>
            ),
          )}
        </nav>

        <div className="nav-actions">
          {actions}
        </div>

        <details
          className="mobile-menu"
          ref={mobileMenuRef}
        >
          <summary aria-label="Buka menu">
            <span />
            <span />
            <span />
          </summary>

          <div>
            {links.map(
              ([label, href, key]) => (
                <Link
                  key={key}
                  href={href}
                  className={
                    active === key
                      ? "nav-active"
                      : undefined
                  }
                  aria-current={
                    active === key
                      ? "page"
                      : undefined
                  }
                  onClick={(event) =>
                    preparePublicTransition(
                      event,
                      key,
                    )
                  }
                >
                  {label}
                </Link>
              ),
            )}

            {actions}
          </div>
        </details>
      </div>
    </header>
  );
}
