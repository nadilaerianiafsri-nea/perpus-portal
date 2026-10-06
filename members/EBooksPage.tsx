"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FiBookOpen } from "react-icons/fi";
import { memberRequest, useMemberResource } from "./api";
import { BookCover, EmptyState, ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import { memberDate } from "./format";
import type { MemberEBook } from "./types";
import styles from "./Members.module.css";

export default function EBooksPage() {
  const router = useRouter();
  const resource = useMemberResource<{ ebooks: MemberEBook[] }>("ebooks");
  const [busy, setBusy] = useState<number | null>(null);
  const pending = useRef(false);
  const [actionError, setActionError] = useState("");
  async function read(bookId: number) {
    if (pending.current) return;
    pending.current = true; setBusy(bookId); setActionError("");
    try { await memberRequest(`ebooks/${bookId}/open`, { method: "POST" }); router.push(`/e-book/${bookId}/baca`); }
    catch (error) { setActionError(error instanceof Error ? error.message : "E-Book belum dapat dibuka. Silakan coba lagi."); pending.current = false; setBusy(null); }
  }
  return <div className={styles.pageStack}><PageHeading title="E-Book Saya" description="Koleksi bacaan digital yang Anda simpan. Buka kembali dan lanjutkan membaca kapan saja." ><Link className={styles.outlineButton} href="/e-book">Jelajahi E-Book</Link></PageHeading>{actionError && <p className={styles.error} role="alert">{actionError}</p>}
    {resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : !resource.data?.ebooks.length ? <EmptyState message="Belum ada E-Book di koleksi Anda." href="/e-book" label="Jelajahi E-Book" /> : resource.data.ebooks.map(ebook => <article className={`${styles.card} ${styles.bookRow}`} key={ebook.id}><BookCover book={ebook.book} /><div className={styles.bookInfo}><h2>{ebook.book.title}</h2><p className={styles.muted}>{ebook.book.author}</p><dl className={styles.details}><div><dt>Kode Buku</dt><dd>{ebook.book.code}</dd></div><div><dt>Ditambahkan</dt><dd>{memberDate(ebook.addedAt)}</dd></div>{ebook.lastOpenedAt && <div><dt>Terakhir Dibuka</dt><dd>{memberDate(ebook.lastOpenedAt, true)}</dd></div>}</dl></div><div className={styles.rowActions}><button className={styles.button} disabled={busy !== null} onClick={() => read(ebook.book.id)}><FiBookOpen />{busy === ebook.book.id ? "Membuka..." : ebook.lastOpenedAt ? "Lanjutkan Bacaan" : "Baca E-Book"}</button><Link className={styles.outlineButton} href={`/koleksi/${ebook.book.id}`}>Lihat Detail</Link></div></article>)}
  </div>;
}
