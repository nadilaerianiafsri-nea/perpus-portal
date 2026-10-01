import { FiBookOpen, FiMail, FiMapPin, FiPhone } from "react-icons/fi";

export default function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-shell footer-top">
        <div className="footer-about">
          <div className="footer-logo"><FiBookOpen /><strong>PerpusRiau</strong></div>
          <p>Portal digital layanan informasi, koleksi, dan peminjaman perpustakaan Kementerian Hukum Riau.</p>
          <a href="#"><FiMail /> Email Layanan</a>
        </div>

        <div className="footer-col">
          <strong>Jelajahi</strong>
          <a href="#koleksi">Koleksi</a>
          <a href="#ebook">E-Book</a>
          <a href="#layanan">Hibah Buku</a>
          <a href="#layanan">Panduan</a>
        </div>

        <div className="footer-col">
          <strong>Bantuan</strong>
          <a href="#layanan">FAQ</a>
          <a href="#layanan">Kontak</a>
          <a href="#layanan">Panduan Peminjaman</a>
        </div>

        <div className="footer-col">
          <strong>Informasi Layanan</strong>
          <span><FiClockIcon /> Jam Layanan</span>
          <span><FiMapPin /> Kemenkum Riau</span>
          <span><FiPhone /> Layanan Perpustakaan</span>
        </div>
      </div>

      <div className="landing-shell footer-bottom">
        <span>© 2026 Perpustakaan Digital Kemenkum Riau</span>
        <span>Portal Layanan Perpustakaan</span>
      </div>
    </footer>
  );
}

function FiClockIcon() {
  return <span aria-hidden="true">◷</span>;
}
