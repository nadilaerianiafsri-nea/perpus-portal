"use client";

import Link from "next/link";
import { FiBell, FiMail, FiMessageCircle, FiUser } from "react-icons/fi";
import { useMember } from "./MemberContext";
import { Badge, BookCover, ErrorState, LoadingCards } from "./MemberUI";
import { initials, loanState, memberDate } from "./format";
import { memberTypeLabels } from "./types";
import styles from "./Members.module.css";

export default function MemberRightPanel() {
  const { summary, user, loading, error, refresh } = useMember();
  const profile = summary?.currentUser ?? user;
  return <aside className={styles.rightPanel} aria-label="Profil dan informasi anggota">
    <section className={`${styles.card} ${styles.profileCard}`} aria-label="Ringkasan profil"><div className={styles.profileBanner} /><div className={styles.profileBody}><span className={styles.profileAvatar}>{initials(profile.name)}</span><h2>{profile.name}</h2><Badge>{profile.memberType ? memberTypeLabels[profile.memberType] : "Anggota"}</Badge>
      <div className={styles.profileStats}>{[[summary?.stats.activeLoans, "Dipinjam"], [summary?.stats.ebooks, "E-Book"], [summary?.stats.history, "Riwayat"]].map(([value, label]) => <div key={label}><strong>{loading ? "…" : value ?? "—"}</strong><small>{label}</small></div>)}</div><Link href="/dashboard/profil" className={styles.outlineButton}><FiUser /> Lihat Profil</Link></div></section>
    <section className={styles.card}><div className={styles.sectionHeading}><h2>Tenggat Terdekat</h2><Link href="/dashboard/pinjaman">Semua</Link></div>
      {loading && !summary ? <LoadingCards /> : error && !summary ? <ErrorState message="Informasi tenggat belum dapat dimuat." retry={refresh} /> : summary && (summary.nearestDeadlines.length ? <div className={styles.deadlineList}>{summary.nearestDeadlines.map(loan => { const state = loanState(loan); return <Link key={loan.id} href="/dashboard/pinjaman" className={styles.deadline}><BookCover book={loan.book} small /><div><strong>{loan.book.title}</strong><Badge tone={state.tone}>{state.label}</Badge><small>{memberDate(loan.dueAt)}</small></div></Link>; })}</div> : <p className={styles.muted}>Tidak ada tenggat dalam waktu dekat.</p>)}
    </section>
    <section className={styles.reminder}><h2><FiBell /> Jadwal Pengingat</h2><p>Pengingat melalui email dan WhatsApp pada H-1, hari jatuh tempo, H+1, lalu setiap 2 hari selama buku belum dikembalikan.</p><div><FiMail aria-hidden /><strong>Email</strong><span>{summary?.reminders.email ?? (loading ? "Memuat status..." : "Status belum tersedia")}</span></div><div><FiMessageCircle aria-hidden /><strong>WhatsApp</strong><span>{summary?.reminders.whatsapp ?? (loading ? "Memuat status..." : "Status belum tersedia")}</span></div><small>Pengingat tetap aktif. Pastikan nomor WhatsApp pada profil Anda benar.</small></section>
  </aside>;
}
