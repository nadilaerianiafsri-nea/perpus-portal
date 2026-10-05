import Link from "next/link";
import { notFound } from "next/navigation";
import CatalogShell from "@/catalog/CatalogShell";
import { getBook } from "@/catalog/serverApi";
import styles from "@/catalog/Catalog.module.css";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { book, unavailable } = await getBook(id);
  if (!book && !unavailable) notFound();
  if (book && book.type !== "EBOOK") notFound();
  // Only embed documents served by this website; never execute external content.
  let source: string | null = null;
  if (book?.ebookUrl?.startsWith("/") && !book.ebookUrl.startsWith("//")) {
    const url = new URL(book.ebookUrl, "https://perpus.local");
    if (/^\/(ebooks|files)\/.+\.(pdf|html)$/i.test(url.pathname))
      source = url.pathname;
  }
  return (
    <CatalogShell ebook>
      <main className={styles.main}>
        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href="/e-book">E-Book</Link>
          <span>/</span>
          <Link href={`/koleksi/${id}`}>Detail Buku</Link>
          <span>/</span>
          <span>Baca</span>
        </nav>
        <h1>{book?.title ?? "Baca E-Book"}</h1>
        {unavailable ? (
          <div className={styles.state}>
            Data koleksi belum dapat dimuat. Silakan coba lagi.
          </div>
        ) : source ? (
          <>
            <p>
              {book?.isDemo
                ? "Bacaan contoh pengembangan, bukan isi publikasi resmi."
                : "Baca koleksi digital melalui halaman ini."}
            </p>
            <iframe
              className={styles.viewer}
              src={source}
              title={`Pembaca ${book?.title}`}
              sandbox="allow-same-origin"
            />
          </>
        ) : (
          <div className={styles.state}>
            <h2>Berkas E-Book belum tersedia.</h2>
            <p>
              Silakan hubungi petugas perpustakaan untuk informasi koleksi
              digital ini.
            </p>
            <Link href={`/koleksi/${id}`}>Kembali ke Detail</Link>
          </div>
        )}
      </main>
    </CatalogShell>
  );
}
