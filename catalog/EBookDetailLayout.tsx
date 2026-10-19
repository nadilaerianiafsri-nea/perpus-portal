import type { ReactNode } from "react";
import Link from "next/link";
import { FiArrowLeft, FiMonitor, FiShield } from "react-icons/fi";
import { DetailCard } from "./BookDetailLayout";
import EBookCover from "./EBookCover";
import type { BookDetail } from "./types";
import shared from "./BookDetail.module.css";
import styles from "./EBookDetail.module.css";

export default function EBookDetailLayout({
  book,
  member,
  action,
  related,
}: {
  book: BookDetail;
  member: boolean;
  action: ReactNode;
  related: ReactNode;
}) {
  const Container = member ? "div" : "main";
  const listHref = member ? "/dashboard/koleksi" : "/koleksi";
  const metadata = [
    ["ISBN / ISSN", book.isbnIssn || "Belum tersedia"],
    ["Penerbit", book.publisher || "Belum tersedia"],
    ["Tahun Terbit", book.year],
    ["Bahasa", book.language || "Belum tersedia"],
    ["Subjek", book.subject || "Belum tersedia"],
    ["Kode E-Book", book.code],
    ["Format", book.format || "Digital"],
    ...(book.edition ? [["Edisi", book.edition]] : []),
  ];
  const access =
    book.accessMode === "PENYEDIA_EKSTERNAL"
      ? "Melalui penyedia eksternal"
      : book.accessMode === "TIDAK_TERSEDIA"
        ? "Belum tersedia"
        : "Baca di Website";
  return (
    <Container
      className={`${shared.page} ${member ? shared.memberPage : ""} ${styles.page}`}
    >
      <div className={styles.topline}>
        <nav className={shared.breadcrumb} aria-label="Detail E-Book">
          <Link href="/">Beranda</Link>
          <span>/</span>
          {member ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <span>/</span>
            </>
          ) : null}
          <Link href={listHref}>Koleksi</Link>
          <span>/</span>
          <span aria-current="page">Detail</span>
        </nav>
        <Link data-button="ghost" data-button-size="md" href={listHref} className={styles.backLink}>
          <FiArrowLeft aria-hidden />{" "}
          {member ? "Kembali ke Katalog" : "Kembali ke Koleksi"}
        </Link>
      </div>
      <section className={styles.hero} aria-labelledby="ebook-title">
        <div className={styles.coverStage}>
          <div className={styles.cover}>
            <EBookCover src={book.coverUrl} title={book.title} />
          </div>
          <span className={styles.coverCaption}>KOLEKSI DIGITAL</span>
        </div>
        <div className={styles.heroContent}>
          <span className={styles.badge}>
            <FiMonitor aria-hidden /> E-Book
          </span>
          <h1 id="ebook-title" className={styles.title}>
            {book.title}
          </h1>
          <p className={styles.author}>
            oleh {book.author || "Penulis belum tersedia"}
          </p>
          <ul className={styles.quickMetadata} aria-label="Ringkasan katalog">
            <li>{book.year}</li>
            {book.language ? <li>Bahasa {book.language}</li> : null}
            {book.subject ? <li>{book.subject}</li> : null}
          </ul>
          <p className={styles.excerpt}>
            {book.description?.trim() || "Deskripsi belum tersedia."}
          </p>
          <div className={`${shared.actions} ${styles.readActions}`}>
            {action}
          </div>
          <p className={styles.accessHint}>
            <FiShield aria-hidden /> Akses membaca memerlukan akun anggota.
          </p>
        </div>
      </section>
      <div className={styles.details}>
        <div className={styles.descriptionColumn}>
          <DetailCard title="Deskripsi" id="book-description-title">
            <p className={styles.description}>
              {book.description?.trim() || "Deskripsi belum tersedia."}
            </p>
          </DetailCard>
          <DetailCard title="Akses E-Book" id="ebook-access-title">
            <dl className={styles.accessFields}>
              <div>
                <dt>Hak Akses</dt>
                <dd>{access}</dd>
              </div>
              <div>
                <dt>Format</dt>
                <dd>{book.format || "Digital"}</dd>
              </div>
              <div>
                <dt>Akun</dt>
                <dd>Memerlukan akun anggota</dd>
              </div>
            </dl>
            {book.licenseNote?.trim() ? (
              <p className={styles.licenseNote}>{book.licenseNote}</p>
            ) : null}
          </DetailCard>
        </div>
        <DetailCard title="Detail Katalog" id="book-catalog-title">
          <dl className={styles.metadata}>
            {metadata.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </DetailCard>
      </div>
      {related}
    </Container>
  );
}
