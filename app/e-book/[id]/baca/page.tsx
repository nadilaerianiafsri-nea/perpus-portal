import { cookies } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser } from "@/auth/serverAuth";
import EBookReader from "@/catalog/EBookReader";
import styles from "@/catalog/Reader.module.css";
import { getBook } from "@/catalog/serverApi";
import { localReaderSource } from "@/shared/displayUrls.cjs";

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

function ReaderState({
  title,
  message,
  href,
}: {
  title: string;
  message: string;
  href: string;
}) {
  return (
    <main className={styles.readerPage}>
      <section className={styles.readerState}>
        <div className={styles.readerStateCard}>
          <h1>{title}</h1>
          <p>{message}</p>
          <Link data-button="back" data-button-size="md" className={styles.stateAction} href={href}>
            Kembali ke Detail E-Book
          </Link>
        </div>
      </section>
    </main>
  );
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

  if (unavailable || access.unavailable) {
    return (
      <ReaderState
        title="Akses E-Book belum dapat diverifikasi."
        message="Silakan coba lagi. Reader tidak dibuka sampai status pinjaman berhasil diverifikasi."
        href={`/dashboard/koleksi/${id}`}
      />
    );
  }

  if (!access.authorized) {
    return (
      <ReaderState
        title="Akses E-Book tidak aktif."
        message="E-Book hanya dapat dibaca selama masa pinjaman aktif. Pinjam kembali dari halaman detail apabila E-Book tersedia."
        href={`/dashboard/koleksi/${id}`}
      />
    );
  }

  if (!source || !book) {
    return (
      <ReaderState
        title="Berkas E-Book belum tersedia."
        message="Silakan hubungi petugas perpustakaan untuk informasi koleksi digital ini."
        href={`/dashboard/koleksi/${id}`}
      />
    );
  }

  return (
    <main className={styles.readerPage}>
      <EBookReader
        key={book.id}
        bookId={book.id}
        source={source}
        title={book.title}
      />
    </main>
  );
}
