"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FiArrowRight, FiBell, FiCheck } from "react-icons/fi";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { Badge, EmptyState, ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import { memberDate } from "./format";
import type { MemberNotification } from "./types";
import styles from "./Members.module.css";
import interaction from "./Notifications.module.css";

export default function NotificationsPage() {
  const router = useRouter();
  const resource = useMemberResource<{ notifications: MemberNotification[] }>("notifications");
  const { refresh } = useMember();
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("Semua");
  const notifications = resource.data?.notifications.filter(item => filter === "Semua" || !item.readAt) ?? [];
  async function markRead(id?: number) {
    if (pending.current) return false;
    pending.current = true; setBusy(id === undefined ? "all" : String(id)); setActionError("");
    try { await memberRequest(id === undefined ? "notifications/read-all" : `notifications/${id}/read`, { method: "PATCH" }); await Promise.all([resource.reload(), refresh()]); return true; }
    catch (error) { setActionError(error instanceof Error ? error.message : "Notifikasi belum dapat diperbarui."); return false; }
    finally { pending.current = false; setBusy(null); }
  }
  async function openNotification(item: MemberNotification, newTab = false) {
    if (pending.current) return;
    // Reserve the tab during the user gesture; load its destination only after PATCH succeeds.
    const tab = newTab ? window.open("about:blank", "_blank") : null;
    if (tab) tab.opener = null;
    if (await markRead(item.id)) {
      if (tab) tab.location.replace(item.href);
      else router.push(item.href);
    } else tab?.close();
  }
  const hasUnread = resource.data?.notifications.some(item => !item.readAt);
  return <div className={styles.pageStack}><PageHeading title="Notifikasi" description="Informasi reservasi, peminjaman, dan pengingat perpustakaan Anda."><button className={styles.outlineButton} disabled={!hasUnread || busy !== null} onClick={() => markRead()}><FiCheck />{busy === "all" ? "Memperbarui..." : "Tandai Semua Dibaca"}</button></PageHeading><div className={styles.filters}>{["Semua", "Belum Dibaca"].map(label => <button key={label} className={filter === label ? styles.selectedFilter : ""} aria-pressed={filter === label} onClick={() => setFilter(label)}>{label}</button>)}</div>{actionError && <p className={styles.error} role="alert">{actionError}</p>}
    {resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : !notifications.length ? <EmptyState message={filter === "Semua" ? "Belum ada notifikasi." : "Semua notifikasi sudah dibaca."} /> : notifications.map(item => {
      const linked = item.href.startsWith("/dashboard");
      return <article key={item.id} className={`${styles.card} ${styles.notification} ${!item.readAt ? styles.unread : ""} ${linked ? interaction.clickable : ""}`}>
        <span className={styles.notificationIcon}><FiBell aria-hidden /></span>
        <div className={styles.bookInfo}>
          <h2>{linked ? <Link
            className={interaction.cardLink}
            href={item.href}
            aria-label={`Lihat detail: ${item.title}`}
            aria-busy={busy === String(item.id)}
            aria-disabled={!item.readAt && busy !== null}
            onClick={event => {
              if (!item.readAt && (event.ctrlKey || event.metaKey || event.shiftKey)) {
                event.preventDefault(); void openNotification(item, true);
              }
            }}
            onAuxClick={event => {
              if (!item.readAt && event.button === 1) {
                event.preventDefault(); void openNotification(item, true);
              }
            }}
            onNavigate={event => {
              if (!item.readAt) { event.preventDefault(); void openNotification(item); }
            }}
            onKeyDown={event => {
              if (event.key === " ") { event.preventDefault(); if (!event.repeat) event.currentTarget.click(); }
            }}
          >{item.title}</Link> : item.title}</h2>
          <p>{item.message}</p><time dateTime={item.createdAt}>{memberDate(item.createdAt, true)}</time>
          <div className={styles.notificationActions}>
            <Badge tone={item.readAt ? "neutral" : "blue"}>{item.readAt ? "Sudah Dibaca" : "Belum Dibaca"}</Badge>
            {!item.readAt && <button className={interaction.actionButton} disabled={busy !== null} onClick={event => { event.stopPropagation(); void markRead(item.id); }}>{busy === String(item.id) ? "Memperbarui..." : "Tandai Dibaca"}</button>}
            {linked && <span className={interaction.detail} data-notification-detail aria-hidden>Lihat detail <FiArrowRight /></span>}
          </div>
        </div>
      </article>;
    })}
  </div>;
}
