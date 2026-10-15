import Link from "next/link";
import BookCard from "./BookCard";
import { getRelatedBooks } from "./serverApi";
import type { Book } from "./types";
import styles from "./BookDetail.module.css";

export function RelatedBooksLoading() {
  return (
    <section
      className={styles.related}
      aria-label="Memuat rekomendasi koleksi"
      aria-busy="true"
    >
      <h2 className={styles.sectionTitle}>Rekomendasi Koleksi Terkait</h2>
      <div className={styles.relatedGrid}>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={styles.relatedSkeleton} />
        ))}
      </div>
    </section>
  );
}
export default async function RelatedBooks({
  book,
  member,
}: {
  book: Book;
  member: boolean;
}) {
  const result = await getRelatedBooks(book);
  const basePath = member ? "/dashboard/koleksi" : "/koleksi";
  return (
    <section className={styles.related} aria-labelledby="related-books-title">
      <h2 className={styles.sectionTitle} id="related-books-title">
        Rekomendasi Koleksi Terkait
      </h2>
      {result.books.length ? (
        <div className={styles.relatedGrid}>
          {result.books.map((item) => (
            <BookCard
              key={item.id}
              book={item}
              basePath={basePath}
              member
              compact
            />
          ))}
        </div>
      ) : (
        <div className={styles.relatedEmpty}>
          <p>
            {result.unavailable
              ? "Rekomendasi koleksi belum dapat dimuat."
              : "Belum ada koleksi terkait untuk buku ini."}
          </p>
          <Link href={basePath}>Jelajahi Koleksi</Link>
        </div>
      )}
    </section>
  );
}
