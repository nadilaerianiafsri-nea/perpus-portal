import Link from "next/link";
import BookCard from "./BookCard";
import { getRelatedBooks } from "./serverApi";
import type { Book } from "./types";
import styles from "./BookDetail.module.css";
import ebookStyles from "./EBookDetail.module.css";

export function RelatedBooksLoading({ ebook = false }: { ebook?: boolean }) {
  return (
    <section
      className={styles.related}
      aria-label="Memuat rekomendasi koleksi"
      aria-busy="true"
    >
      <h2 className={styles.sectionTitle}>
        {ebook ? "Rekomendasi E-Book Terkait" : "Rekomendasi Koleksi Terkait"}
      </h2>
      <div className={ebook ? ebookStyles.relatedGrid : styles.relatedGrid}>
        {Array.from({ length: ebook ? 5 : 6 }, (_, index) => (
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
  const ebook = book.type === "EBOOK";
  return (
    <section className={styles.related} aria-labelledby="related-books-title">
      <h2
        className={`${styles.sectionTitle} ${ebook ? ebookStyles.relatedTitle : ""}`}
        id="related-books-title"
      >
        {ebook ? "Rekomendasi E-Book Terkait" : "Rekomendasi Koleksi Terkait"}
      </h2>
      {result.books.length ? (
        <div className={ebook ? ebookStyles.relatedGrid : styles.relatedGrid}>
          {result.books.map((item) => (
            <BookCard
              key={item.id}
              book={item}
              basePath={basePath}
              member={member}
              compact
            />
          ))}
        </div>
      ) : (
        <div className={styles.relatedEmpty}>
          <p>
            {result.unavailable
              ? `Rekomendasi ${ebook ? "E-Book" : "koleksi"} belum dapat dimuat.`
              : `Belum ada ${ebook ? "E-Book" : "koleksi"} terkait untuk ${ebook ? "E-Book" : "buku"} ini.`}
          </p>
          <Link data-button="secondary" data-button-size="md"
            href={
              ebook
                ? member
                  ? "/dashboard/koleksi?type=EBOOK"
                  : "/e-book"
                : basePath
            }
          >
            Jelajahi {ebook ? "E-Book" : "Koleksi"}
          </Link>
        </div>
      )}
    </section>
  );
}
