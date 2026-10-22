import type { ReactNode } from "react";
import Link from "next/link";
import { FiArrowLeft, FiShield } from "react-icons/fi";
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
  const listHref = member ? "/dashboard/koleksi" : "/koleksi";
  const access =
    book.accessMode === "PENYEDIA_EKSTERNAL"
      ? "Melalui penyedia eksternal"
      : book.accessMode === "TIDAK_TERSEDIA"
        ? "Belum tersedia"
        : "Baca di Website";

  if (!member) {
    const publicMetadata = [
      ["Kode Koleksi", book.code],
      ["ISBN / ISSN", book.isbnIssn || "Belum tersedia"],
      ["Penerbit", book.publisher || "Belum tersedia"],
      ["Tahun Terbit", book.year],
      ...(book.edition ? [["Edisi", book.edition]] : []),
      ["Bahasa", book.language || "Belum tersedia"],
      ["Subjek", book.subject || "Belum tersedia"],
      ["Format", book.format || "Digital"],
    ];

    return (
      <main
        className={`${shared.page} ${shared.publicPage} ${styles.page} ${styles.publicPage}`}
      >
        <nav className={shared.breadcrumb} aria-label="Detail E-Book">
          <Link href="/">Beranda</Link>
          <span>/</span>
          <Link href={listHref}>Koleksi</Link>
          <span>/</span>
          <span aria-current="page">Detail</span>
        </nav>

        <header className={styles.publicHeading}>
          <div className={styles.headingCopy}>
            <span className={styles.publicKicker}>E-BOOK</span>
            <h1 data-page-title>Detail E-Book</h1>
            <p>
              Informasi koleksi digital dan akses yang tersedia untuk
              pengunjung perpustakaan.
            </p>
          </div>
          <Link
            data-button="ghost"
            data-button-size="md"
            href={listHref}
            className={styles.publicBackLink}
          >
            <FiArrowLeft aria-hidden /> Kembali ke Koleksi
          </Link>
        </header>

        <section className={styles.publicHero} aria-labelledby="ebook-title">
          <div className={styles.publicCoverStage}>
            <div className={styles.publicCover}>
              <EBookCover src={book.coverUrl} title={book.title} />
            </div>
            <span className={styles.coverCaption}>KOLEKSI DIGITAL</span>
          </div>

          <div className={styles.publicHeroContent}>
            <span className={styles.publicType}>E-Book</span>
            <h2 id="ebook-title" className={styles.publicTitle}>
              {book.title}
            </h2>
            <p className={styles.publicAuthor}>
              {book.author || "Penulis belum tersedia"}
            </p>
            <div className={styles.publicFacts}>
              <span>{book.subject || "Subjek belum tersedia"}</span>
              <span>{book.year}</span>
            </div>
            <div className={`${shared.actions} ${styles.publicActions}`}>
              {action}
            </div>
            <p className={styles.publicAccessHint}>
              <FiShield aria-hidden /> Akses membaca memerlukan akun anggota.
            </p>
          </div>
        </section>

        <div className={styles.publicDetails}>
          <div className={styles.publicDescriptionColumn}>
            <DetailCard title="Deskripsi" id="book-public-description-title">
              <p className={styles.description}>
                {book.description?.trim() || "Deskripsi belum tersedia."}
              </p>
            </DetailCard>

            <DetailCard title="Akses E-Book" id="ebook-public-access-title">
              <dl className={styles.accessFields}>
                <div>
                  <dt>Jenis Akses</dt>
                  <dd>{access}</dd>
                </div>
                <div>
                  <dt>Akun</dt>
                  <dd>Memerlukan akun anggota</dd>
                </div>
              </dl>
            </DetailCard>
          </div>

          <DetailCard
            title="Informasi Bibliografi"
            id="book-public-catalog-title"
          >
            <dl className={styles.metadata}>
              {publicMetadata.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </DetailCard>
        </div>

        {related}
      </main>
    );
  }

  const metadata = [
    ["Penulis / Pengarang", book.author || "Penulis belum tersedia"],
    ["ISBN / ISSN", book.isbnIssn || "Belum tersedia"],
    ["Penerbit", book.publisher || "Belum tersedia"],
    ["Tahun Terbit", book.year],
    ["Bahasa", book.language || "Belum tersedia"],
    ["Subjek", book.subject || "Belum tersedia"],
    ["Kode E-Book", book.code],
    ["Format", book.format || "Digital"],
    ...(book.edition ? [["Edisi", book.edition]] : []),
  ];

  return (
    <div className={`${shared.page} ${shared.memberPage} ${styles.page}`}>
      <div className={styles.topline}>
        <nav className={shared.breadcrumb} aria-label="Detail E-Book">
          <Link href="/">Beranda</Link>
          <span>/</span>
          <Link href="/dashboard">Dashboard</Link>
          <span>/</span>
          <Link href={listHref}>Koleksi</Link>
          <span>/</span>
          <span aria-current="page">Detail</span>
        </nav>
        <Link
          data-button="back"
          data-button-size="md"
          href={listHref}
          className={styles.backLink}
        >
          <FiArrowLeft aria-hidden /> Kembali ke Katalog
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
          <h1 data-page-title id="ebook-title" className={styles.title}>
            {book.title}
          </h1>
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
    </div>
  );
}
