import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/auth/serverAuth";
import CatalogShell from "./CatalogShell";
import BorrowAction from "./BorrowAction";
import EBookLibraryAction from "./EBookLibraryAction";
import BookDetailLayout from "./BookDetailLayout";
import EBookDetailLayout from "./EBookDetailLayout";
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
        <h1 data-page-title>Detail koleksi belum dapat dimuat.</h1>
        <p>Silakan coba lagi untuk melihat informasi buku.</p>
        <Link data-button="primary" data-button-size="md" className={styles.primaryLink} href={`${basePath}/${id}`}>
          Coba Lagi
        </Link>
        <Link data-button={member ? "back" : "ghost"} data-button-size="md" className={styles.secondaryLink} href={basePath}>
          {member ? "Kembali ke Katalog" : "Kembali ke Koleksi"}
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
  const memberHref = `/dashboard/koleksi/${book.id}`;
  const loginHref = `/login?returnUrl=${encodeURIComponent(memberHref)}`;
  const action = !member ? (
    user ? (
      <Link data-button="primary" data-button-size="md"
        className={styles.primaryLink}
        href={user.role === "ADMIN" ? "/admin" : memberHref}
      >
        Buka di Dashboard
      </Link>
    ) : (
      <>
        {ebook || book.availableCopies > 0 ? (
          <Link data-button="primary" data-button-size="md" className={styles.primaryLink} href={loginHref}>
            {ebook
              ? "Masuk untuk Pinjam E-Book"
              : "Masuk untuk Ajukan Peminjaman"}
          </Link>
        ) : (
          <button data-button="primary" data-button-size="md" className={styles.primaryLink} disabled>
            Tidak Tersedia
          </button>
        )}
        <Link data-button="secondary" data-button-size="md" className={styles.secondaryLink} href="/register">
          Daftar Anggota
        </Link>
      </>
    )
  ) : ebook ? (
    <EBookLibraryAction
      key={book.id}
      bookId={book.id}
      role={user?.role ?? null}
    />
  ) : (
    <BorrowAction
      key={book.id}
      available={book.availableCopies > 0}
      bookId={book.id}
      role={user?.role ?? null}
    />
  );
  const Layout = ebook ? EBookDetailLayout : BookDetailLayout;
  const content = (
    <Layout
      book={book}
      member={member}
      action={action}
      related={
        <Suspense fallback={<RelatedBooksLoading ebook={ebook} />}>
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
