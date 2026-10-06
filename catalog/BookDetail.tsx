import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogShell from "./CatalogShell";
import BorrowAction from "./BorrowAction";
import EBookLibraryAction from "./EBookLibraryAction";
import { getCurrentUser } from "@/auth/serverAuth";
import { BookStatus } from "./BookCard";
import { getBook } from "./serverApi";
import { typeLabels } from "./types";
import styles from "./Catalog.module.css";

export default async function BookDetail({ id }: { id: string }) {
  const [{ book, unavailable }, user] = await Promise.all([getBook(id), getCurrentUser()]);
  if (unavailable)
    return (
      <CatalogShell>
        <main className={styles.main}>
          <div className={styles.state}>
            <h1>Data koleksi belum dapat dimuat. Silakan coba lagi.</h1>
            <Link className={styles.detailLink} href={`/koleksi/${id}`}>
              Coba Lagi
            </Link>
            <Link href="/koleksi">Kembali ke Katalog</Link>
          </div>
        </main>
      </CatalogShell>
    );
  if (!book) notFound();
  const ebook = book.type === "EBOOK";
  const metadata = [
    ["Kode Buku", book.code],
    ["ISBN/ISSN", book.isbnIssn ?? "Belum tersedia"],
    ["Penerbit", book.publisher],
    ["Tahun Terbit", book.year],
    ["Edisi", book.edition ?? "Tidak dicantumkan"],
    ["Bahasa", book.language],
    ["Subjek", book.subject],
    ["Jenis Koleksi", typeLabels[book.type]],
    ["Format", book.format],
    ...(!ebook
      ? [
          ["Lokasi / Rak", book.shelf ?? "Belum ditentukan"],
          ["Total Eksemplar", book.totalCopies],
          ["Jumlah Tersedia", book.availableCopies],
        ]
      : []),
  ];
  return (
    <CatalogShell ebook={ebook}>
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/">Beranda</Link>
          <span>/</span>
          <Link href={ebook ? "/e-book" : "/koleksi"}>
            {ebook ? "E-Book" : "Koleksi"}
          </Link>
          <span>/</span>
          <span>Detail Buku</span>
        </nav>
        <article className={styles.detail}>
          <div className={styles.detailCover}>
            <Image
              src={book.coverUrl}
              alt={`Sampul ${book.title}`}
              fill
              priority
              sizes="(max-width: 600px) 280px, 340px"
            />
          </div>
          <div>
            <h1>{book.title}</h1>
            <p>{book.author}</p>
            <BookStatus book={book} />
            {book.isDemo && <p>Data contoh pengembangan.</p>}
            <dl className={styles.metadata}>
              {metadata.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <h2>Deskripsi</h2>
            <p>{book.description}</p>
            {ebook ? (
              <>
              <Link
                className={styles.primaryButton}
                href={`/e-book/${book.id}/baca`}
              >
                Baca E-Book
              </Link>
              <EBookLibraryAction key={book.id} bookId={book.id} role={user?.role ?? null} />
              </>
            ) : (
              <BorrowAction key={book.id} available={book.availableCopies > 0} bookId={book.id} role={user?.role ?? null} />
            )}
          </div>
        </article>
        {!ebook && (
          <section className={styles.tableWrap}>
            <h2>Eksemplar Buku</h2>
            <table className={styles.copyTable}>
              <thead>
                <tr>
                  <th>Kode Eksemplar</th>
                  <th>Status</th>
                  <th>Lokasi</th>
                </tr>
              </thead>
              <tbody>
                {book.copies.map((copy) => (
                  <tr key={copy.id}>
                    <td>{copy.code}</td>
                    <td>
                      {copy.status === "TERSEDIA"
                        ? "Tersedia"
                        : copy.status === "DIRESERVASI"
                          ? "Direservasi"
                          : copy.status === "HILANG" ? "Hilang" : "Dipinjam"}
                    </td>
                    <td>{copy.location}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </CatalogShell>
  );
}
