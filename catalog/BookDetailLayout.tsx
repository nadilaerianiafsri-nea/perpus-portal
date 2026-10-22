import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  FiArrowLeft,
  FiClock,
  FiInfo,
  FiMapPin,
  FiMonitor,
  FiRefreshCw,
  FiShield,
} from "react-icons/fi";
import { safeCoverUrl } from "@/shared/displayUrls.cjs";
import { BookStatus } from "./BookCard";
import { type BookDetail, typeLabels } from "./types";
import styles from "./BookDetail.module.css";

export function DetailCard({
  title,
  id,
  children,
}: {
  title: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.card} aria-labelledby={id}>
      <h2 id={id} className={styles.sectionTitle}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function BookDetailLayout({
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
  const basePath = member ? "/dashboard/koleksi" : "/koleksi";

  if (!member) {
    const publicMetadata = [
      ["Kode Koleksi", book.code],
      ["ISBN / ISSN", book.isbnIssn || "Belum tersedia"],
      ["Penerbit", book.publisher || "Belum tersedia"],
      ["Tahun Terbit", book.year],
      ...(book.edition ? [["Edisi", book.edition]] : []),
      ["Bahasa", book.language || "Belum tersedia"],
      ["Format", book.format || "Fisik"],
      ["Subjek", book.subject || "Belum tersedia"],
    ];

    return (
      <main className={`${styles.page} ${styles.publicPage}`}>
        <nav className={styles.breadcrumb} aria-label="Detail koleksi">
          <Link href="/">Beranda</Link>
          <span>/</span>
          <Link href={basePath}>Koleksi</Link>
          <span>/</span>
          <span aria-current="page">Detail</span>
        </nav>

        <header className={`${styles.heading} ${styles.publicHeading}`}>
          <div className={styles.headingCopy}>
            <h1 data-page-title>Detail Buku</h1>
          </div>
          <Link
            data-button="primary"
            data-button-size="md"
            className={`${styles.backLink} ${styles.publicBackLink}`}
            href={basePath}
          >
            <FiArrowLeft aria-hidden /> Kembali ke Koleksi
          </Link>
        </header>

        <section
          className={`${styles.card} ${styles.publicHero}`}
          aria-labelledby="public-book-title"
        >
          <div className={styles.publicCoverStage}>
            <div className={`${styles.cover} ${styles.publicCover}`}>
              <Image
                src={safeCoverUrl(book.coverUrl)}
                alt={`Sampul ${book.title}`}
                fill
                priority
                sizes="(max-width: 700px) 160px, 220px"
              />
            </div>
          </div>

          <div className={styles.publicHeroContent}>
            <span className={styles.publicType}>{typeLabels[book.type]}</span>
            <h2 id="public-book-title" className={styles.publicBookTitle}>
              {book.title}
            </h2>
            <p className={styles.publicAuthor}>{book.author}</p>
            <div className={styles.publicFacts}>
              <span>{book.subject || "Subjek belum tersedia"}</span>
              <span>{book.year}</span>
            </div>
            <div className={`${styles.actions} ${styles.publicActions}`}>
              {action}
            </div>
          </div>
        </section>

        <div className={styles.publicDetailGrid}>
          <DetailCard title="Informasi Bibliografi" id="book-public-catalog-title">
            <dl className={`${styles.catalogFields} ${styles.publicCatalogFields}`}>
              {publicMetadata.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </DetailCard>

          <DetailCard title="Ketersediaan" id="book-public-availability-title">
            <dl
              className={`${styles.availabilityFields} ${styles.publicAvailability}`}
            >
              <div>
                <dt>Status Koleksi</dt>
                <dd>
                  <BookStatus book={book} />
                </dd>
              </div>
              <div>
                <dt>Stok Tersedia</dt>
                <dd className={styles.stock}>
                  {book.totalCopies > 0
                    ? `${book.availableCopies} dari ${book.totalCopies} eksemplar tersedia`
                    : "Informasi stok belum tersedia"}
                </dd>
              </div>
            </dl>
            <p className={styles.note}>
              Masuk sebagai anggota untuk mengajukan peminjaman dan melihat
              informasi layanan anggota.
            </p>
          </DetailCard>

          <section
            className={`${styles.card} ${styles.publicDescriptionCard}`}
            aria-labelledby="book-public-description-title"
          >
            <h2
              id="book-public-description-title"
              className={styles.sectionTitle}
            >
              Deskripsi
            </h2>
            <p className={styles.description}>
              {book.description?.trim() || "Deskripsi belum tersedia."}
            </p>
          </section>
        </div>

        {related}
      </main>
    );
  }

  const ebook = book.type === "EBOOK";
  const locations = [
    ...new Set(book.copies.map((copy) => copy.location).filter(Boolean)),
  ];
  const location =
    [...locations, book.shelf].filter(Boolean).join(" · ") ||
    "Belum ditentukan";
  const metadata = [
    ["Kode Buku", book.code],
    ["ISBN / ISSN", book.isbnIssn || "Belum tersedia"],
    ["Penerbit", book.publisher || "Belum tersedia"],
    ["Tahun Terbit", book.year],
    ...(book.edition ? [["Edisi", book.edition]] : []),
    ["Bahasa", book.language],
    ["Subjek", book.subject],
    ...(ebook ? [["Format", book.format]] : []),
  ];

  return (
    <div className={`${styles.page} ${styles.memberPage}`}>
      <nav className={styles.breadcrumb} aria-label="Detail koleksi">
        <Link href="/">Beranda</Link>
        <span>/</span>
        <Link href="/dashboard">Dashboard</Link>
        <span>/</span>
        <Link href={basePath}>Koleksi</Link>
        <span>/</span>
        <span aria-current="page">Detail</span>
      </nav>
      <header className={styles.heading}>
        <h1 data-page-title>Detail Buku</h1>
        <Link
          data-button="back"
          data-button-size="md"
          className={styles.backLink}
          href={basePath}
        >
          <FiArrowLeft aria-hidden /> Kembali ke Katalog
        </Link>
      </header>
      <div className={styles.cardGrid}>
        <DetailCard title="Informasi Buku" id="book-information-title">
          <div className={styles.bookSummary}>
            <div className={styles.cover}>
              <Image
                src={safeCoverUrl(book.coverUrl)}
                alt={`Sampul ${book.title}`}
                fill
                priority
                sizes="(max-width: 600px) 88px, 112px"
              />
            </div>
            <dl className={styles.summaryFields}>
              <div>
                <dt>Judul</dt>
                <dd>
                  <h3>{book.title}</h3>
                </dd>
              </div>
              <div>
                <dt>Penulis</dt>
                <dd>{book.author}</dd>
              </div>
              <div>
                <dt>Jenis Koleksi</dt>
                <dd>{typeLabels[book.type]}</dd>
              </div>
              <div>
                <dt>Kategori</dt>
                <dd>{book.subject || "Belum tersedia"}</dd>
              </div>
            </dl>
          </div>
          {book.isDemo ? (
            <p className={styles.note}>Data contoh pengembangan.</p>
          ) : null}
        </DetailCard>
        <DetailCard title="Detail Katalog" id="book-catalog-title">
          <dl className={styles.catalogFields}>
            {metadata.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </DetailCard>
        <DetailCard title="Ketersediaan" id="book-availability-title">
          <dl className={styles.availabilityFields}>
            <div>
              <dt>Status Koleksi</dt>
              <dd>
                <BookStatus book={book} />
              </dd>
            </div>
            {!ebook ? (
              <>
                <div>
                  <dt>Stok Tersedia</dt>
                  <dd className={styles.stock}>
                    {book.availableCopies} / {book.totalCopies}
                  </dd>
                </div>
                <div className={styles.location}>
                  <dt>Lokasi</dt>
                  <dd>
                    <FiMapPin aria-hidden />
                    {location}
                  </dd>
                </div>
              </>
            ) : (
              <div>
                <dt>Jenis Akses</dt>
                <dd>
                  <FiMonitor aria-hidden />
                  Koleksi digital
                </dd>
              </div>
            )}
          </dl>
          <div className={styles.actions}>{action}</div>
          <p className={styles.note}>
            {ebook
              ? "Akses baca tersedia melalui area anggota."
              : "Reservasi mengunci 1 stok buku selama 24 jam. Masa pinjam 7 hari dimulai setelah petugas mengonfirmasi pengambilan."}
          </p>
        </DetailCard>
        <DetailCard title="Deskripsi" id="book-description-title">
          <p className={styles.description}>
            {book.description || "Deskripsi belum tersedia."}
          </p>
          <div className={styles.codeCallout}>
            <span>Kode Katalog</span>
            <strong>{book.code}</strong>
          </div>
        </DetailCard>
      </div>
      <section
        className={`${styles.card} ${styles.loanInfo}`}
        aria-labelledby="book-loan-information"
      >
        <h2 className={styles.sectionTitle} id="book-loan-information">
          <FiInfo aria-hidden /> Informasi Peminjaman
        </h2>
        <dl className={styles.loanRules}>
          <div>
            <FiClock aria-hidden />
            <dt>Masa Pinjam</dt>
            <dd>7 hari</dd>
          </div>
          <div>
            <FiRefreshCw aria-hidden />
            <dt>{ebook ? "Akses Baca" : "Perpanjangan"}</dt>
            <dd>
              {ebook ? "Melalui pembaca E-Book" : "+7 hari per perpanjangan"}
            </dd>
          </div>
          <div>
            <FiShield aria-hidden />
            <dt>Denda</dt>
            <dd>Tidak ada denda uang</dd>
          </div>
        </dl>
      </section>
      {related}
    </div>
  );
}
