import { safeCoverUrl } from "../shared/displayUrls.cjs";
import Image from "next/image";
import Link from "next/link";
import { FiBookOpen, FiCheckCircle, FiClock, FiMonitor } from "react-icons/fi";
import { type Book, availabilityLabels, typeLabels } from "./types";
import styles from "./Catalog.module.css";

export function BookStatus({ book }: { book: Book }) {
  const status = book.availability;
  return (
    <span
      className={`${styles.status} ${book.type === "EBOOK" ? styles.digital : status === "TERSEDIA" ? styles.available : status === "DIRESERVASI" ? styles.reserved : styles.unavailable}`}
    >
      {book.type === "EBOOK" ? (
        <FiMonitor />
      ) : status === "TERSEDIA" ? (
        <FiCheckCircle />
      ) : (
        <FiClock />
      )}
      {book.type === "EBOOK"
        ? "E-Book"
        : status
          ? availabilityLabels[status]
          : ""}
    </span>
  );
}

export default function BookCard({
  book,
  basePath = "/koleksi",
}: {
  book: Book;
  basePath?: string;
}) {
  const detailHref = `${basePath}/${book.id}`;

  return (
    <article className={styles.card}>
      <Link
        href={detailHref}
        className={styles.cover}
        aria-label={`Lihat detail ${book.title}`}
      >
        <Image
          src={safeCoverUrl(book.coverUrl)}
          alt={`Sampul ${book.title}`}
          fill
          sizes="(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
        />
        <span className={styles.typeBadge}>
          {book.type === "EBOOK" ? <FiMonitor /> : <FiBookOpen />}
          {typeLabels[book.type]}
        </span>
      </Link>
      <div className={styles.cardBody}>
        <h2>
          <Link href={detailHref}>{book.title}</Link>
        </h2>
        <p>{book.author}</p>
        <small>
          {book.code} · {book.year}
        </small>
        <BookStatus book={book} />
        <Link className={styles.detailLink} href={detailHref}>
          Lihat Detail
        </Link>
      </div>
    </article>
  );
}
