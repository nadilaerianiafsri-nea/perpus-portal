"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FiCalendar, FiChevronDown, FiInfo } from "react-icons/fi";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import ReservationCard from "./ReservationCard";
import type { Reservation } from "./types";
import styles from "./Members.module.css";
import reservationStyles from "./Reservations.module.css";

export default function ReservationsPage() {
  const resource = useMemberResource<{ reservations: Reservation[] }>("reservations");
  const { refresh } = useMember();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const pending = useRef(false);
  const [notice, setNotice] = useState("");
  const [actionError, setActionError] = useState("");
  const reservations = resource.data?.reservations ?? [];
  const active = reservations.filter(item => item.status === "MENUNGGU_PENGAMBILAN").sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt));
  const finished = reservations.filter(item => item.status !== "MENUNGGU_PENGAMBILAN");
  async function sync() { await Promise.all([resource.reload(), refresh()]); }
  async function expired() { setHistoryOpen(true); await sync(); }
  async function cancel(id: number) {
    if (pending.current) return;
    pending.current = true; setBusy(id); setActionError(""); setNotice("");
    try { await memberRequest(`reservations/${id}/cancel`, { method: "PATCH" }); setNotice("Reservasi dibatalkan. Eksemplar tersedia kembali."); setHistoryOpen(true); await sync(); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Reservasi belum dapat dibatalkan."); }
    finally { pending.current = false; setBusy(null); }
  }
  return <div className={styles.pageStack}><PageHeading title="Reservasi Saya" description="Buku yang menunggu pengambilan. Ambil sebelum batas waktu 24 jam." />
    {notice && <p className={styles.success} role="status">{notice}</p>}{actionError && <p className={styles.error} role="alert">{actionError}</p>}
    {resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : <>
      {!active.length ? <section className={reservationStyles.empty}><FiCalendar aria-hidden /><h2>Belum ada reservasi aktif.</h2><p>Buku yang Anda reservasi akan muncul di sini.</p><Link className={styles.button} href="/koleksi">Cari Koleksi</Link></section> : active.map(reservation => <ReservationCard key={reservation.id} reservation={reservation} onExpire={expired} onCancel={() => cancel(reservation.id)} busy={busy !== null} />)}
      <aside className={reservationStyles.information}><FiInfo aria-hidden /><p>Jika buku tidak diambil dalam 24 jam, reservasi otomatis <strong>kedaluwarsa</strong> dan stok dilepas kembali. Reservasi tidak dihitung sebagai pinjaman 7 hari.</p></aside>
      {!!finished.length && <details className={reservationStyles.history} open={historyOpen} onToggle={event => setHistoryOpen(event.currentTarget.open)}><summary>Riwayat reservasi <span>{finished.length}</span><FiChevronDown aria-hidden /></summary><div>{finished.map(reservation => <ReservationCard key={reservation.id} reservation={reservation} onExpire={expired} />)}</div></details>}
    </>}
  </div>;
}
