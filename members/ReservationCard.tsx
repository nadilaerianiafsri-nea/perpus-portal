"use client";

import Image from "next/image";
import Link from "next/link";
import { FiCalendar, FiClock, FiMapPin } from "react-icons/fi";
import { memberDate } from "./format";
import { useCountdown } from "./useCountdown";
import type { Reservation } from "./types";
import styles from "./Reservations.module.css";

const labels: Record<Reservation["status"], string> = {
  MENUNGGU_PENGAMBILAN: "Menunggu Pengambilan", KEDALUWARSA: "Kedaluwarsa",
  DIBATALKAN: "Dibatalkan", DIAMBIL: "Sudah Diambil",
};

function ReservationCountdown({ deadline, onExpire }: { deadline: string; onExpire: () => void }) {
  const seconds = useCountdown(deadline, onExpire);
  const values = seconds === null ? ["—", "—", "—"] : [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60].map(value => String(value).padStart(2, "0"));
  return <div className={styles.countdown}>
    <span>Ambil sebelum batas</span>
    <div className={styles.digits} role="timer" aria-label={seconds === null ? "Memuat sisa waktu pengambilan" : `${values[0]} jam ${values[1]} menit ${values[2]} detik tersisa`}>
      <strong>{values[0]}</strong><span aria-hidden>:</span><strong>{values[1]}</strong><span aria-hidden>:</span><strong>{values[2]}</strong>
    </div>
    <small>{seconds === 0 ? "Memeriksa status reservasi..." : "Reservasi berlaku 24 jam"}</small>
  </div>;
}

export default function ReservationCard({ reservation, onExpire, onCancel, busy = false }: {
  reservation: Reservation; onExpire: () => void; onCancel?: () => void; busy?: boolean;
}) {
  const active = reservation.status === "MENUNGGU_PENGAMBILAN";
  return <article className={`${styles.card} ${!active ? styles.finished : ""}`} data-reservation-id={reservation.id}>
    <header className={styles.header}><FiCalendar aria-hidden /><strong>{active ? "Reservasi Aktif" : "Reservasi Selesai"}</strong><span><FiClock aria-hidden />{labels[reservation.status]}</span></header>
    <div className={styles.body}>
      <Link href={`/koleksi/${reservation.book.id}`} className={styles.cover}><Image src={reservation.book.coverUrl || "/images/landing/book-placeholder-1.svg"} alt={`Sampul ${reservation.book.title}`} fill sizes="96px" unoptimized /></Link>
      <div className={styles.info}>
        <Link href={`/koleksi/${reservation.book.id}`}><h2>{reservation.book.title}</h2></Link>
        <p className={styles.author}>{reservation.book.author}</p>
        <dl className={styles.metadata}>
          <div><dt>Kode</dt><dd><strong>{reservation.book.code}</strong></dd></div>
          <div><dt>Reservasi</dt><dd><time dateTime={reservation.createdAt}>{memberDate(reservation.createdAt, true)}</time></dd></div>
          <div><FiMapPin aria-hidden /><dt className={styles.srOnly}>Lokasi pengambilan</dt><dd>{reservation.pickupLocation}</dd></div>
          <div className={styles.deadline}><FiCalendar aria-hidden /><dt>Batas:</dt><dd><time dateTime={reservation.expiresAt}>{memberDate(reservation.expiresAt, true)}</time></dd></div>
        </dl>
        <div className={styles.footer}><small>Eksemplar: {reservation.copy.code}</small>{active && onCancel && <button type="button" disabled={busy} onClick={onCancel} aria-label={`Batalkan reservasi ${reservation.book.title}`}>{busy ? "Membatalkan..." : "Batalkan Reservasi"}</button>}</div>
        {!active && <p className={styles.finishedNote}>{reservation.status === "DIAMBIL" ? "Pengambilan telah dikonfirmasi oleh petugas perpustakaan." : reservation.status === "KEDALUWARSA" ? "Batas pengambilan telah berakhir. Stok buku dilepas kembali." : "Reservasi telah dibatalkan. Stok buku dilepas kembali."}</p>}
      </div>
      {active && <ReservationCountdown deadline={reservation.expiresAt} onExpire={onExpire} />}
    </div>
  </article>;
}
