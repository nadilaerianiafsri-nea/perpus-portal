import Image from "next/image";

export default function LandingNavbar() {
  return (
    <header className="site-header">
      <div className="shell navbar">
        <a
          className="brand"
          href="#beranda"
          aria-label="Kembali ke beranda"
        >
          <span className="brand-mark">
            <Image
              src="/images/landing/logo-placeholder.svg"
              alt="Logo perpustakaan"
              width={46}
              height={46}
              priority
            />
          </span>

          <span className="brand-copy">
            <strong>Perpustakaan Digital</strong>
            <small>Kementerian Hukum Riau</small>
          </span>
        </a>

        <nav className="desktop-nav" aria-label="Navigasi utama">
          <a href="#beranda">Beranda</a>
          <a href="#layanan">Layanan</a>
          <a href="#koleksi">Koleksi</a>
          <a href="#tentang">Tentang</a>
        </nav>

        <div className="desktop-actions">
          <a className="btn btn-ghost" href="#koleksi">
            Jelajahi
          </a>

          <a className="btn btn-primary" href="#">
            Masuk
          </a>
        </div>

        <details className="mobile-menu">
          <summary aria-label="Buka menu">
            <span />
            <span />
            <span />
          </summary>

          <div className="mobile-menu-panel">
            <a href="#beranda">Beranda</a>
            <a href="#layanan">Layanan</a>
            <a href="#koleksi">Koleksi</a>
            <a href="#tentang">Tentang</a>

            <a className="btn btn-primary" href="#">
              Masuk
            </a>
          </div>
        </details>
      </div>
    </header>
  );
}