"use client";

import Image from "next/image";
import Link from "next/link";
import { useCountdown } from "./useCountdown";
import { FiBookOpen, FiRefreshCw } from "react-icons/fi";
import type { MemberBook } from "./types";
import styles from "./Members.module.css";

export function LoadingCards() {
  return <div className={styles.loading} role="status" aria-label="Memuat data"><span className={styles.srOnly}>Memuat data...</span>{[1, 2, 3].map(id => <div className={styles.skeleton} key={id} />)}</div>;
}
export function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return <div className={styles.error} role="alert"><p>{message}</p><button className={styles.button} onClick={retry}><FiRefreshCw /> Coba lagi</button></div>;
}
export function EmptyState({ message, href, label = "Cari Koleksi" }: { message: string; href?: string; label?: string }) {
  return <div className={styles.empty}><FiBookOpen size={32} aria-hidden /><p>{message}</p>{href && <Link className={styles.button} href={href}>{label}</Link>}</div>;
}
export function PageHeading({ title, description, children }: { title: string; description: string; children?: React.ReactNode }) {
  return <div className={styles.pageHeading}><div><h1>{title}</h1><p>{description}</p></div>{children}</div>;
}
export function BookCover({ book, small = false }: { book: MemberBook; small?: boolean }) {
  return <div className={`${styles.cover} ${small ? styles.coverSmall : ""}`}><Image src={book.coverUrl || "/images/landing/book-placeholder-1.svg"} alt={`Sampul ${book.title}`} fill sizes={small ? "40px" : "72px"} unoptimized /></div>;
}
export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: string }) {
  return <span className={`${styles.badge} ${styles[tone] ?? ""}`}>{children}</span>;
}
export function Countdown({ deadline, onExpire }: { deadline: string; onExpire: () => void }) {
  const seconds = useCountdown(deadline, onExpire);
  const value = seconds === null ? "— : — : —" : [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(number => String(number).padStart(2, "0")).join(" : ");
  return <div className={styles.countdown}><small>Sisa waktu pengambilan</small><strong aria-label={`Sisa waktu pengambilan ${value}`}>{value}</strong></div>;
}
