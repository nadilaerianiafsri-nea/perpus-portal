import Link from "next/link";
import { FiBookOpen, FiMail } from "react-icons/fi";
import ServiceDetails from "./ServiceDetails";
import { getLibrarySettings } from "@/information/librarySettings";
import { serviceInfo } from "@/shared/serviceInfo.cjs";
import styles from "./LandingFooter.module.css";

export default async function LandingFooter({
  catalog = false,
}: {
  catalog?: boolean;
}) {
  const settings = await getLibrarySettings();

  if (catalog)
    return (
      <footer className="landing-footer">
        <div className="landing-shell footer-top">
          <div className="footer-about">
            <div className="footer-logo">
              <span className="wordmark-box">P</span>
              <div>
                <strong>{settings.libraryName}</strong>
                <small>KEMENKUM RIAU</small>
              </div>
            </div>
            <p>
              Portal digital layanan informasi, koleksi, dan peminjaman untuk{" "}
              {settings.libraryName}.
            </p>
          </div>

          <div className={`footer-col ${styles.linkColumn}`}>
            <strong>Jelajahi</strong>
            <Link href="/koleksi">Koleksi</Link>
            <Link href="/e-book">E-Book</Link>
            <Link href="/hibah-buku">Hibah Buku</Link>
            <Link href="/panduan">Panduan</Link>
          </div>

          <div className={`footer-col ${styles.linkColumn}`}>
            <strong>Bantuan</strong>
            <Link href="/tentang">Tentang</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/kontak">Kontak</Link>
            <Link href="/panduan">Panduan Peminjaman</Link>
          </div>

          <div className="footer-col">
            <strong>Informasi Layanan</strong>
            <ServiceDetails settings={settings} />
          </div>
        </div>

        <div className="landing-shell footer-bottom">
          <span>© 2026 {settings.libraryName}</span>
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
            <strong>{settings.libraryName}</strong>
          </div>
          <p>
            Portal digital layanan informasi, koleksi, dan peminjaman untuk{" "}
            {settings.libraryName}.
          </p>
          <a href={`mailto:${serviceInfo.email}`}>
            <FiMail /> {serviceInfo.email}
          </a>
        </div>

        <div className={`footer-col ${styles.linkColumn}`}>
          <strong>Jelajahi</strong>
          <Link href="/koleksi">Koleksi</Link>
          <Link href="/e-book">E-Book</Link>
          <Link href="/hibah-buku">Hibah Buku</Link>
          <Link href="/panduan">Panduan</Link>
        </div>

        <div className={`footer-col ${styles.linkColumn}`}>
          <strong>Bantuan</strong>
          <Link href="/faq">FAQ</Link>
          <Link href="/kontak">Kontak</Link>
          <Link href="/panduan">Panduan Peminjaman</Link>
        </div>

        <div className="footer-col">
          <strong>Informasi Layanan</strong>
          <ServiceDetails settings={settings} />
        </div>
      </div>

      <div className="landing-shell footer-bottom">
        <span>© 2026 {settings.libraryName}</span>
        <span>Portal Layanan Perpustakaan</span>
      </div>
    </footer>
  );
}
