import { safeCoverUrl } from "../shared/displayUrls.cjs";
import Image from "next/image";
import Link from "next/link";
import {
  FiBookOpen,
  FiCheckCircle,
  FiClock,
  FiEye,
  FiMonitor,
} from "react-icons/fi";
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
  member = false,
  compact = false,
  rowAction = false,
}: {
  book: Book;
  basePath?: string;
  member?: boolean;
  compact?: boolean;
  rowAction?: boolean;
}) {
  const detailHref = `${basePath}/${book.id}`;
  const details = (
    <>
      <h2>
        <Link href={detailHref} title={member ? book.title : undefined}>
          {book.title}
        </Link>
      </h2>
      <p title={member ? book.author : undefined}>{book.author}</p>
      {member ? (
        <small>
          {book.year}
          {book.language ? ` · ${book.language}` : ""}
          <span className={styles.memberBookCode}>{book.code}</span>
        </small>
      ) : null}
    </>
  );
  const typeBadge = (
    <span className={styles.typeBadge}>
      {book.type === "EBOOK" ? <FiMonitor /> : <FiBookOpen />}
      {typeLabels[book.type]}
    </span>
  );
  const memberActions = (
    <>
      <BookStatus book={book} />
      <Link
        data-button="secondary"
        data-button-size="md"
        data-row-action="neutral"
        data-button-shape={rowAction ? "square" : undefined}
        title={rowAction ? "Lihat detail koleksi" : undefined}
        aria-label={rowAction ? `Lihat detail ${book.title}` : undefined}
        className={styles.detailLink}
        href={detailHref}
      >
        {rowAction ? <FiEye aria-hidden="true" /> : "Lihat Detail"}
      </Link>
    </>
  );
  const publicAction = (
    <Link
      data-button="primary"
      data-button-size="md"
      data-public-detail
      className={styles.detailLink}
      href={detailHref}
    >
      Lihat Detail
    </Link>
  );

  return (
    <article
      className={`${styles.card}${compact ? ` ${styles.relatedCard}` : ""}`}
      data-catalog-view={rowAction ? "list" : "grid"}
    >
      <Link
        href={detailHref}
        className={styles.cover}
        aria-label={`Lihat detail ${book.title}`}
      >
        <Image
          src={safeCoverUrl(book.coverUrl)}
          alt={`Sampul ${book.title}`}
          fill
          sizes={
            compact
              ? "(max-width: 600px) 45vw, (max-width: 1100px) 30vw, 16vw"
              : member
                ? "(max-width: 600px) 90vw, (max-width: 900px) 45vw, (max-width: 1200px) 30vw, 20vw"
                : "(max-width: 600px) 50vw, (max-width: 1000px) 33vw, 25vw"
          }
        />
        {member || !rowAction ? typeBadge : null}
      </Link>
      <div className={styles.cardBody}>
        {member ? (
          <div className={styles.memberCardCopy}>{details}</div>
        ) : (
          details
        )}
        {!member && rowAction ? (
          <span data-public-list-type>{typeBadge}</span>
        ) : null}
        {member ? (
          <div className={styles.memberCardFooter}>{memberActions}</div>
        ) : (
          publicAction
        )}
      </div>
    </article>
  );
}
