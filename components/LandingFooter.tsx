import Image from "next/image";

export default function LandingFooter() {
  return (
    <footer className="footer">
      <div className="shell footer-grid">
        <div className="footer-intro">
          <div className="footer-brand">
            <Image
              src="/images/landing/logo-placeholder.svg"
              alt="Logo perpustakaan"
              width={44}
              height={44}
            />

            <div>
              <strong>Perpustakaan Digital</strong>
              <span>Kementerian Hukum Riau</span>
            </div>
          </div>

          <p>
            Portal perpustakaan digital untuk memudahkan akses terhadap
            koleksi, informasi, dan layanan perpustakaan.
          </p>
        </div>

        <div className="footer-column">
          <strong>Navigasi</strong>
          <a href="#beranda">Beranda</a>
          <a href="#layanan">Layanan</a>
          <a href="#koleksi">Koleksi</a>
        </div>

        <div className="footer-column">
          <strong>Informasi</strong>
          <a href="#tentang">Tentang</a>
          <a href="#">Panduan</a>
          <a href="#">Kontak</a>
        </div>

        <div className="footer-column">
          <strong>Akun</strong>
          <a href="#">Masuk</a>
          <a href="#">Daftar</a>
        </div>
      </div>

      <div className="shell footer-bottom">
        <span>© 2026 Perpustakaan Digital.</span>
        <span>Kementerian Hukum Riau</span>
      </div>
    </footer>
  );
}