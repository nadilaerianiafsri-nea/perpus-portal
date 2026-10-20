"use client";

import Image from "next/image";
import Link from "next/link";
import StatCard, { type StatTone } from "@/components/StatCard";
import { FiAlertTriangle, FiBookOpen, FiClock, FiMonitor, FiSearch, FiXCircle } from "react-icons/fi";
import { useMember } from "./MemberContext";
import { BookCover, Countdown, EmptyState, ErrorState, LoadingCards } from "./MemberUI";
import { memberDate } from "./format";
import styles from "./Members.module.css";

export default function SummaryPage() {
  const { summary, user, loading, error, refresh } = useMember();
  return <div className={styles.pageStack}>
    <section className={styles.hero}><div className={styles.heroCopy}><span className={styles.welcome}>Selamat datang kembali</span><h1>Halo, {summary?.currentUser.name ?? user.name}</h1><p>Perpustakaan adalah rumah yang hangat bagi para pencari ilmu. Lanjutkan bacaan Anda atau temukan koleksi baru hari ini.</p><div className={styles.heroActions}><Link data-button="accent" className={styles.yellowButton} href="/dashboard/koleksi"><FiSearch /> Cari Koleksi</Link><Link data-button="secondary" data-button-inverse className={styles.heroSecondary} href="/dashboard/e-book">E-Book Saya</Link></div></div><div className={styles.heroArt}><Image src="/images/ASSET PERPUS/Hero pengingat.png" alt="Maskot perpustakaan dengan pengingat bacaan" fill sizes="220px" priority /></div></section>
    {error && <ErrorState message="Data dashboard belum dapat dimuat. Silakan coba lagi." retry={refresh} />}
    {loading && !summary ? <LoadingCards /> : summary && <>
      {summary.alerts.overdue.length > 0 && <div className={styles.alert} role="alert"><FiXCircle aria-hidden /><div><strong>Anda memiliki pinjaman yang terlambat</strong><p>{summary.alerts.overdue.map(loan => loan.book.title).join(", ")} telah melewati jatuh tempo. Tidak ada denda — mohon segera dikembalikan.</p></div><Link data-button="secondary" data-button-size="sm" href="/dashboard/pinjaman">Lihat</Link></div>}
      {summary.alerts.lost.length > 0 && <div className={styles.alert} role="alert"><FiXCircle aria-hidden /><div><strong>Buku dinyatakan hilang</strong><p>Silakan menghubungi petugas perpustakaan untuk penanganan lebih lanjut sesuai kebijakan perpustakaan.</p></div></div>}
      <section className={styles.statsGrid} aria-label="Statistik anggota">{[
        { label: "Menunggu Pengambilan", value: summary.stats.waitingPickup, icon: FiClock, tone: "info", href: "/dashboard/reservasi" },
        { label: "Sedang Dipinjam", value: summary.stats.activeLoans, icon: FiBookOpen, tone: "primary", href: "/dashboard/pinjaman" },
        { label: "Jatuh Tempo Besok", value: summary.stats.dueTomorrow, icon: FiAlertTriangle, tone: "warning", href: "/dashboard/pinjaman" },
        { label: "E-Book Saya", value: summary.stats.ebooks, icon: FiMonitor, tone: "yellow", href: "/dashboard/e-book" },
      ].map(stat => <StatCard key={stat.label} label={stat.label} value={stat.value} tone={stat.tone as StatTone} icon={<stat.icon />} href={stat.href} />)}</section>
      <section className={styles.card}><div className={styles.sectionHeading}><h2>Reservasi Hampir Habis</h2><Link data-button="ghost" data-button-size="sm" href="/dashboard/reservasi">Semua reservasi</Link></div>{summary.activeReservations.length ? <div className={styles.reservationList}>{summary.activeReservations.slice(0, 3).map(reservation => <article key={reservation.id} className={styles.summaryReservation}><BookCover book={reservation.book} /><div className={styles.bookInfo}><Link href={`/dashboard/koleksi/${reservation.book.id}`}><strong>{reservation.book.title}</strong></Link><small>{reservation.book.code} · Ambil sebelum {memberDate(reservation.expiresAt, true)}</small></div><Countdown deadline={reservation.expiresAt} onExpire={refresh} /></article>)}</div> : <EmptyState message="Belum ada reservasi aktif." href="/dashboard/koleksi" />}</section>
    </>}
  </div>;
}
