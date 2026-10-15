import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { localReaderSource } from "@/shared/displayUrls.cjs";
import CatalogShell from "@/catalog/CatalogShell";
import { getBook } from "@/catalog/serverApi";
import styles from "@/catalog/Catalog.module.css";
import { getCurrentUser } from "@/auth/serverAuth";
import EBookReader from "@/catalog/EBookReader";

const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";
const privatePdf =
  /^\/private-ebooks\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/;

async function hasActiveEBookAccess(bookId: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get("perpus_session")?.value;
  if (!token) return { authorized: false, unavailable: false };
  try {
    const response = await fetch(
      `${API_URL}/members/me/ebooks/${encodeURIComponent(bookId)}/status`,
      {
        headers: { Cookie: `perpus_session=${encodeURIComponent(token)}` },
        cache: "no-store",
      },
    );
    if (response.status === 401) {
      return { authorized: false, unavailable: false };
    }
    if (!response.ok) return { authorized: false, unavailable: true };
    const status = (await response.json()) as { state?: string };
    return {
      authorized: status.state === "BORROWED_BY_ME",
      unavailable: false,
    };
  } catch {
    return { authorized: false, unavailable: true };
  }
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ book, unavailable }, user] = await Promise.all([
    getBook(id),
    getCurrentUser(),
  ]);
  if (!user || !user.emailVerified) {
    redirect(`/login?next=${encodeURIComponent(`/e-book/${id}/baca`)}`);
  }
  if (user.role !== "PENGUNJUNG") redirect("/admin");
  if (!book && !unavailable) notFound();
  if (book && book.type !== "EBOOK") notFound();

  const access = await hasActiveEBookAccess(id);
  const storedSource = book?.ebookUrl ?? null;
  const source = access.authorized
    ? storedSource && privatePdf.test(storedSource)
      ? `/api/members/me/ebooks/${encodeURIComponent(id)}/file.pdf`
      : localReaderSource(storedSource)
    : null;

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

        {unavailable || access.unavailable ? (
          <div className={styles.state}>
            <h2>Akses E-Book belum dapat diverifikasi.</h2>
            <p>
              Silakan coba lagi. Reader tidak dibuka sampai status pinjaman
              berhasil diverifikasi.
            </p>
            <Link href={`/koleksi/${id}`}>Kembali ke Detail</Link>
          </div>
        ) : !access.authorized ? (
          <div className={styles.state}>
            <h2>Akses E-Book tidak aktif.</h2>
            <p>
              E-Book hanya dapat dibaca selama masa pinjaman aktif. Pinjam
              kembali dari halaman detail apabila E-Book tersedia.
            </p>
            <Link href={`/koleksi/${id}`}>Kembali ke Detail E-Book</Link>
          </div>
        ) : source ? (
          <>
            <p>
              {book?.isDemo
                ? "Bacaan contoh pengembangan, bukan isi publikasi resmi."
                : "Baca koleksi digital melalui halaman ini."}
            </p>
            {book ? (
              <EBookReader
                key={book.id}
                bookId={book.id}
                source={source}
                title={book.title}
              />
            ) : null}
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
