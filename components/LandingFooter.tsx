import Link from "next/link";
import { FiBookOpen, FiMail } from "react-icons/fi";
import ServiceDetails from "./ServiceDetails";
import { serviceInfo } from "@/shared/serviceInfo.cjs";

export default function LandingFooter({
  catalog = false,
}: {
  catalog?: boolean;
}) {
  if (catalog)
    return (
      <footer className="landing-footer">
        <div className="landing-shell footer-top">
          <div className="footer-about">
            <div className="footer-logo">
              <span className="wordmark-box">P</span>
              <div>
                <strong>Perpustakaan</strong>
                <small>[LOGO KEMENKUM RIAU]</small>
              </div>
            </div>
            <p>
              Portal digital library institusi. Data berlabel contoh digunakan
              untuk keperluan pengembangan.
            </p>
            <span className="catalog-demo">Data Contoh</span>
          </div>
          <div className="footer-col">
            <strong>Jelajahi</strong>
            <Link href="/koleksi">Koleksi</Link>
            <Link href="/e-book">E-Book</Link>
            <Link href="/hibah-buku">Hibah Buku</Link>
            <Link href="/panduan">Panduan</Link>
          </div>
          <div className="footer-col">
            <strong>Bantuan</strong>
            <Link href="/tentang">Tentang</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/kontak">Kontak</Link>
            <Link href="/panduan">Panduan Peminjaman</Link>
          </div>
          <div className="footer-col">
            <strong>Informasi Layanan</strong>
            <ServiceDetails />
          </div>
        </div>
        <div className="landing-shell footer-bottom">
          <span>© 2026 Perpustakaan Kemenkum Riau — Data Contoh.</span>
          <span>Kebijakan Privasi · Syarat Layanan</span>
        </div>
      </footer>
    );
  return (
    <footer className="landing-footer">
      <div className="landing-shell footer-top">
        <div className="footer-about">
          <div className="footer-logo">
            <FiBookOpen />
            <strong>PerpusRiau</strong>
          </div>
          <p>
            Portal digital layanan informasi, koleksi, dan peminjaman
            perpustakaan Kementerian Hukum Riau.
          </p>
          <a href={`mailto:${serviceInfo.email}`}>
            <FiMail /> {serviceInfo.email}
          </a>
        </div>

        <div className="footer-col">
          <strong>Jelajahi</strong>
          <Link href="/koleksi">Koleksi</Link>
          <Link href="/e-book">E-Book</Link>
          <Link href="/hibah-buku">Hibah Buku</Link>
          <Link href="/panduan">Panduan</Link>
        </div>

        <div className="footer-col">
          <strong>Bantuan</strong>
          <Link href="/faq">FAQ</Link>
          <Link href="/kontak">Kontak</Link>
          <Link href="/panduan">Panduan Peminjaman</Link>
        </div>

        <div className="footer-col">
          <strong>Informasi Layanan</strong>
          <ServiceDetails />
        </div>
      </div>

      <div className="landing-shell footer-bottom">
        <span>© 2026 Perpustakaan Digital Kemenkum Riau</span>
        <span>Portal Layanan Perpustakaan</span>
      </div>
    </footer>
  );
}
