import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth/serverAuth";
import CatalogShell from "./CatalogShell";
import BorrowAction from "./BorrowAction";
import EBookLibraryAction from "./EBookLibraryAction";
import BookDetailLayout from "./BookDetailLayout";
import RelatedBooks, { RelatedBooksLoading } from "./RelatedBooks";
import { getBook } from "./serverApi";
import styles from "./BookDetail.module.css";

export default async function BookDetail({
  id,
  member = false,
}: {
  id: string;
  member?: boolean;
}) {
  const [{ book, unavailable }, user] = await Promise.all([
    getBook(id, member),
    getCurrentUser(),
  ]);
  const basePath = member ? "/dashboard/koleksi" : "/koleksi";
  if (unavailable) {
    const state = (
      <section className={`${styles.page} ${styles.error}`} role="alert">
        <h1>Koleksi belum dapat dimuat.</h1>
        <p>Silakan coba lagi untuk melihat informasi buku.</p>
        <Link className={styles.primaryLink} href={`${basePath}/${id}`}>
          Coba Lagi
        </Link>
        <Link className={styles.secondaryLink} href={basePath}>
          Kembali ke Koleksi
        </Link>
      </section>
    );
    return member ? (
      state
    ) : (
      <CatalogShell>
        <main>{state}</main>
      </CatalogShell>
    );
  }
  if (!book) notFound();
  const ebook = book.type === "EBOOK";
  const loginHref = `/login?next=${encodeURIComponent(`/koleksi/${book.id}`)}`;
  const action = !user ? (
    <>
      {ebook || book.availableCopies > 0 ? (
        <Link className={styles.primaryLink} href={loginHref}>
          {ebook ? "Masuk untuk Baca E-Book" : "Masuk untuk Ajukan Peminjaman"}
        </Link>
      ) : (
        <button className={styles.primaryLink} disabled>
          Tidak Tersedia
        </button>
      )}
      <Link className={styles.secondaryLink} href="/register">
        Daftar Anggota
      </Link>
    </>
  ) : ebook ? (
    <EBookLibraryAction
      key={book.id}
      bookId={book.id}
      role={user.role}
      readAfterBorrow
    />
  ) : (
    <BorrowAction
      key={book.id}
      available={book.availableCopies > 0}
      bookId={book.id}
      role={user.role}
    />
  );
  const content = (
    <BookDetailLayout
      book={book}
      member={member}
      action={action}
      related={
        <Suspense fallback={<RelatedBooksLoading />}>
          <RelatedBooks book={book} member={member} />
        </Suspense>
      }
    />
  );
  return member ? (
    content
  ) : (
    <CatalogShell ebook={ebook}>{content}</CatalogShell>
  );
}
