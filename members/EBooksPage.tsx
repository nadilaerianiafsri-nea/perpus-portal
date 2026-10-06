"use client";

import Image from "next/image";
import Link from "next/link";
import { FiMonitor } from "react-icons/fi";
import { useMemberResource } from "./api";
import { ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import type { MemberEBook } from "./types";
import shared from "./Members.module.css";
import styles from "./EBooks.module.css";

export default function EBooksPage() {
  const resource = useMemberResource<{ ebooks: MemberEBook[] }>("ebooks");
  return <div className={shared.pageStack}>
    <PageHeading title="E-Book Saya" description="Koleksi digital yang sedang Anda baca. Lanjutkan dari terakhir dibuka." />
    {resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message="E-Book Anda belum dapat dimuat. Silakan coba lagi." retry={resource.reload} /> : !resource.data?.ebooks.length ? <div className={styles.empty}>
      <FiMonitor size={32} aria-hidden /><h2>Belum ada E-Book yang sedang Anda baca.</h2><p>Buka katalog E-Book dan mulai membaca koleksi digital perpustakaan.</p><Link className={styles.read} href="/e-book">Jelajahi E-Book</Link>
    </div> : <div className={styles.grid}>{resource.data.ebooks.map(ebook => {
      const progress = Number.isFinite(ebook.progress) ? Math.round(Math.max(0, Math.min(100, ebook.progress))) : 0;
      return <article className={styles.card} key={ebook.id} data-ebook-id={ebook.book.id}>
        <div className={styles.header}><FiMonitor aria-hidden />E-Book</div>
        <div className={styles.body}>
          <Link className={styles.cover} href={`/koleksi/${ebook.book.id}`} aria-label={`Lihat detail ${ebook.book.title}`}><Image src={ebook.book.coverUrl || "/images/landing/book-placeholder-1.svg"} alt={`Sampul ${ebook.book.title}`} fill sizes="80px" unoptimized /></Link>
          <div className={styles.information}><h2>{ebook.book.title}</h2><p>Progres membaca</p><progress className={styles.progress} value={progress} max={100} aria-label={`Progres membaca ${ebook.book.title}: ${progress}%`} /><span className={styles.percentage}>{progress}%</span><Link className={styles.read} href={`/e-book/${ebook.book.id}/baca`}>Lanjut Baca</Link></div>
        </div>
      </article>;
    })}</div>}
  </div>;
}