"use client";

import Link from "next/link";
import { useState } from "react";
import { useMemberResource } from "./api";
import { Badge, BookCover, EmptyState, ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import { loanState, memberDate } from "./format";
import type { Loan } from "./types";
import styles from "./Members.module.css";

export default function HistoryPage() {
  const resource = useMemberResource<{ loans: Loan[] }>("loans/history");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Semua");
  const loans = resource.data?.loans.filter(loan => {
    const state = loanState(loan);
    return `${loan.book.title} ${loan.book.code} ${loan.copy.code}`.toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id")) && (filter === "Semua" || state.label === filter);
  }) ?? [];
  return <div className={styles.pageStack}><PageHeading title="Riwayat Peminjaman" description="Catatan peminjaman dan pengembalian buku Anda." /><div className={styles.filterBar}><label className={styles.field}><span>Cari riwayat</span><input type="search" placeholder="Judul atau kode buku..." value={search} onChange={event => setSearch(event.target.value)} /></label><label className={styles.field}><span>Status</span><select value={filter} onChange={event => setFilter(event.target.value)}>{["Semua", "Aktif", "Dikembalikan", "Terlambat", "Hilang"].map(status => <option key={status}>{status}</option>)}</select></label></div>
    {resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : !loans.length ? <EmptyState message={resource.data?.loans.length ? "Tidak ada riwayat yang cocok dengan pencarian." : "Belum ada riwayat peminjaman."} href="/koleksi" /> : loans.map(loan => { const state = loanState(loan); return <article key={loan.id} className={`${styles.card} ${styles.bookRow}`}><BookCover book={loan.book} /><div className={styles.bookInfo}><Link href={`/koleksi/${loan.book.id}`}><h2>{loan.book.title}</h2></Link><Badge tone={state.tone}>{state.label}</Badge><dl className={styles.details}><div><dt>Kode Buku</dt><dd>{loan.book.code}</dd></div><div><dt>Kode Eksemplar</dt><dd>{loan.copy.code}</dd></div><div><dt>Tanggal Pinjam</dt><dd>{memberDate(loan.borrowedAt)}</dd></div><div><dt>Jatuh Tempo</dt><dd>{memberDate(loan.dueAt)}</dd></div><div><dt>Tanggal Kembali</dt><dd>{memberDate(loan.returnedAt)}</dd></div><div><dt>Perpanjangan</dt><dd>{loan.extensionCount} kali</dd></div></dl></div></article>; })}
  </div>;
}
