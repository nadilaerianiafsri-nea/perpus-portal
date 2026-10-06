"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { Badge, BookCover, Countdown, EmptyState, ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import { memberDate } from "./format";
import type { Reservation } from "./types";
import styles from "./Members.module.css";

const labels: Record<Reservation["status"], string> = { MENUNGGU_PENGAMBILAN: "Menunggu Pengambilan", KEDALUWARSA: "Kedaluwarsa", DIBATALKAN: "Dibatalkan", DIAMBIL: "Sudah Diambil" };
export default function ReservationsPage() {
  const resource = useMemberResource<{ reservations: Reservation[] }>("reservations");
  const { refresh } = useMember();
  const [filter, setFilter] = useState("Semua");
  const [busy, setBusy] = useState<number | null>(null);
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const reservations = resource.data?.reservations.filter(item => filter === "Semua" || (filter === "Aktif" ? item.status === "MENUNGGU_PENGAMBILAN" : item.status !== "MENUNGGU_PENGAMBILAN")) ?? [];
  async function sync() { await Promise.all([resource.reload(), refresh()]); }
  async function cancel(id: number) {
    if (pending.current) return;
    pending.current = true; setBusy(id); setActionError(""); setNotice("");
    try { await memberRequest(`reservations/${id}/cancel`, { method: "PATCH" }); setNotice("Reservasi dibatalkan. Eksemplar tersedia kembali."); await sync(); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Reservasi belum dapat dibatalkan."); }
    finally { pending.current = false; setBusy(null); }
  }
  return <div className={styles.pageStack}><PageHeading title="Reservasi Saya" description="Ambil buku di perpustakaan dalam 24 jam setelah pengajuan." /><div className={styles.filters} aria-label="Filter reservasi">{["Semua", "Aktif", "Selesai/Kedaluwarsa"].map(label => <button key={label} aria-pressed={filter === label} onClick={() => setFilter(label)} className={filter === label ? styles.selectedFilter : ""}>{label}</button>)}</div>
    {notice && <p className={styles.success} role="status">{notice}</p>}{actionError && <p className={styles.error} role="alert">{actionError}</p>}
    {resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : !reservations.length ? <EmptyState message={filter === "Semua" ? "Belum ada reservasi." : "Tidak ada reservasi pada filter ini."} href="/koleksi" /> : reservations.map(reservation => <article key={reservation.id} className={`${styles.card} ${styles.bookRow}`}><BookCover book={reservation.book} /><div className={styles.bookInfo}><Link href={`/koleksi/${reservation.book.id}`}><h2>{reservation.book.title}</h2></Link><Badge tone={reservation.status === "MENUNGGU_PENGAMBILAN" ? "blue" : reservation.status === "DIAMBIL" ? "green" : "neutral"}>{labels[reservation.status]}</Badge><dl className={styles.details}><div><dt>Kode Buku</dt><dd>{reservation.book.code}</dd></div><div><dt>Kode Eksemplar</dt><dd>{reservation.copy.code}</dd></div><div><dt>Tanggal Reservasi</dt><dd>{memberDate(reservation.createdAt, true)}</dd></div><div><dt>Batas Pengambilan</dt><dd>{memberDate(reservation.expiresAt, true)}</dd></div></dl>{reservation.status === "MENUNGGU_PENGAMBILAN" && <p className={styles.muted}>Pengambilan dikonfirmasi oleh petugas perpustakaan.</p>}</div>{reservation.status === "MENUNGGU_PENGAMBILAN" && <div className={styles.rowActions}><Countdown deadline={reservation.expiresAt} onExpire={sync} /><button className={styles.outlineButton} disabled={busy !== null} onClick={() => cancel(reservation.id)}>{busy === reservation.id ? "Membatalkan..." : "Batalkan Reservasi"}</button></div>}</article>)}
  </div>;
}
