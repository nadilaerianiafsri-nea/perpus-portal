"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { FiBell, FiCheck } from "react-icons/fi";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { Badge, EmptyState, ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import { memberDate } from "./format";
import type { MemberNotification } from "./types";
import styles from "./Members.module.css";

export default function NotificationsPage() {
  const resource = useMemberResource<{ notifications: MemberNotification[] }>("notifications");
  const { refresh } = useMember();
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("Semua");
  const notifications = resource.data?.notifications.filter(item => filter === "Semua" || !item.readAt) ?? [];
  async function markRead(id?: number) {
    if (pending.current) return;
    pending.current = true; setBusy(id === undefined ? "all" : String(id)); setActionError("");
    try { await memberRequest(id === undefined ? "notifications/read-all" : `notifications/${id}/read`, { method: "PATCH" }); await Promise.all([resource.reload(), refresh()]); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Notifikasi belum dapat diperbarui."); }
    finally { pending.current = false; setBusy(null); }
  }
  const hasUnread = resource.data?.notifications.some(item => !item.readAt);
  return <div className={styles.pageStack}><PageHeading title="Notifikasi" description="Informasi reservasi, peminjaman, dan pengingat perpustakaan Anda."><button className={styles.outlineButton} disabled={!hasUnread || busy !== null} onClick={() => markRead()}><FiCheck />{busy === "all" ? "Memperbarui..." : "Tandai Semua Dibaca"}</button></PageHeading><div className={styles.filters}>{["Semua", "Belum Dibaca"].map(label => <button key={label} className={filter === label ? styles.selectedFilter : ""} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>{actionError && <p className={styles.error} role="alert">{actionError}</p>}
    {resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : !notifications.length ? <EmptyState message={filter === "Semua" ? "Belum ada notifikasi." : "Semua notifikasi sudah dibaca."} /> : notifications.map(item => <article key={item.id} className={`${styles.card} ${styles.notification} ${!item.readAt ? styles.unread : ""}`}><span className={styles.notificationIcon}><FiBell aria-hidden /></span><div className={styles.bookInfo}><h2>{item.title}</h2><p>{item.message}</p><time dateTime={item.createdAt}>{memberDate(item.createdAt, true)}</time><div className={styles.notificationActions}><Badge tone={item.readAt ? "neutral" : "blue"}>{item.readAt ? "Sudah Dibaca" : "Belum Dibaca"}</Badge>{item.href.startsWith("/dashboard") && <Link href={item.href}>Lihat detail</Link>}{!item.readAt && <button disabled={busy !== null} onClick={() => markRead(item.id)}>{busy === String(item.id) ? "Memperbarui..." : "Tandai Dibaca"}</button>}</div></div></article>)}
  </div>;
}
