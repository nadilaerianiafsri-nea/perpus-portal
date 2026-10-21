"use client";

import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
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
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const reservations = resource.data?.reservations ?? [];
  const active = reservations.filter(item => item.status === "MENUNGGU_PENGAMBILAN").sort((a, b) => Date.parse(a.expiresAt) - Date.parse(b.expiresAt));
  const finished = reservations.filter(item => item.status !== "MENUNGGU_PENGAMBILAN");
  async function sync() { await Promise.all([resource.reload(), refresh()]); }
  async function expired() { setHistoryOpen(true); await sync(); }
  async function cancel(id: number) {
    if (pending.current) return;
    pending.current = true; setBusy(id); setActionError(""); setNotice("");
    try { await memberRequest(`reservations/${id}/cancel`, { method: "PATCH" }); setNotice("Reservasi dibatalkan. Eksemplar tersedia kembali."); setHistoryOpen(true); await sync(); setSelectedReservation(null); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Reservasi belum dapat dibatalkan."); }
    finally { pending.current = false; setBusy(null); }
  }
  return <div className={styles.pageStack}><PageHeading title="Reservasi Saya" />
    {notice && <p className={styles.success} role="status">{notice}</p>}{actionError && !selectedReservation && <p className={styles.error} role="alert">{actionError}</p>}
    {resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : <>
      {!active.length ? <section className={reservationStyles.empty}><FiCalendar aria-hidden /><h2>Belum ada reservasi aktif.</h2><p>Buku yang Anda reservasi akan muncul di sini.</p><Link data-button="primary" className={styles.button} href="/dashboard/koleksi">Cari Koleksi</Link></section> : active.map(reservation => <ReservationCard key={reservation.id} reservation={reservation} onExpire={expired} onCancel={() => { setActionError(""); setSelectedReservation(reservation); }} busy={busy !== null} />)}
      <aside className={reservationStyles.information}><FiInfo aria-hidden /><p>Jika buku tidak diambil dalam 24 jam, reservasi otomatis <strong>kedaluwarsa</strong> dan stok dilepas kembali. Reservasi tidak dihitung sebagai pinjaman 7 hari.</p></aside>
      {!!finished.length && <details className={reservationStyles.history} open={historyOpen} onToggle={event => setHistoryOpen(event.currentTarget.open)}><summary>Riwayat reservasi <span>{finished.length}</span><FiChevronDown aria-hidden /></summary><div>{finished.map(reservation => <ReservationCard key={reservation.id} reservation={reservation} onExpire={expired} />)}</div></details>}
    </>}
    <ConfirmDialog
      open={selectedReservation !== null}
      title="Batalkan Reservasi?"
      description="Reservasi akan dibatalkan dan eksemplar buku tersedia kembali untuk anggota lain."
      variant="danger"
      confirmLabel="Batalkan Reservasi"
      loadingLabel="Membatalkan..."
      pending={busy !== null}
      error={actionError}
      onCancel={() => setSelectedReservation(null)}
      onConfirm={() => selectedReservation ? cancel(selectedReservation.id) : undefined}
    >
      {selectedReservation && <p><strong>{selectedReservation.book.title}</strong></p>}
    </ConfirmDialog>
  </div>;
}
