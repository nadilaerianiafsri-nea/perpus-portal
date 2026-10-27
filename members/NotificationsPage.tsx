"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { FiAlertCircle, FiBell, FiBookOpen, FiCalendar, FiCheck, FiChevronRight, FiMonitor } from "react-icons/fi";
import { Button } from "@/components/Button";
import SearchField from "@/components/SearchField";
import PeriodSelector from "@/components/PeriodSelector";
import { createTransactionPeriod, inTransactionPeriod } from "@/shared/transactionPeriod";
import { memberNotificationTarget } from "@/shared/memberNotificationTarget.cjs";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { EmptyState, ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import { memberDate } from "./format";
import type { MemberNotification } from "./types";
import styles from "./Notifications.module.css";

function NotificationIcon({ type }: { type?: string | null }) {
  const Icon = type === "RESERVATION" ? FiCalendar : type === "LOAN" ? FiBookOpen : type === "LOST_BOOK" ? FiAlertCircle : type?.startsWith("EBOOK_") ? FiMonitor : FiBell;
  return <span className={styles.icon} aria-hidden="true"><Icon /></span>;
}

export default function NotificationsPage() {
  const router = useRouter();
  const resource = useMemberResource<{ notifications: MemberNotification[] }>("notifications");
  const { refresh } = useMember();
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  const [actionError, setActionError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState(() => createTransactionPeriod("all"));
  const all = resource.data?.notifications ?? [];
  const unread = all.filter(item => !item.readAt).length;
  const query = search.trim().toLocaleLowerCase("id-ID");
  const notifications = all.filter(item => (filter === "all" || !item.readAt)
    && inTransactionPeriod(item.createdAt, period)
    && (!query || `${item.title} ${item.message}`.toLocaleLowerCase("id-ID").includes(query)));
  const filtered = Boolean(query) || period.preset !== "all";

  async function markRead(id?: number) {
    if (pending.current) return false;
    pending.current = true;
    setBusy(id === undefined ? "all" : String(id));
    setActionError("");
    try {
      await memberRequest(id === undefined ? "notifications/read-all" : `notifications/${id}/read`, { method: "PATCH" });
      await Promise.all([resource.reload(), refresh()]);
      return true;
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Notifikasi belum dapat diperbarui.");
      return false;
    } finally {
      pending.current = false;
      setBusy(null);
    }
  }
  async function openNotification(item: MemberNotification, newTab = false) {
    if (pending.current) return;
    const destination = memberNotificationTarget(item);
    if (!destination) return;
    // Reserve the tab during the gesture; navigate only after persistence succeeds.
    const tab = newTab ? window.open("about:blank", "_blank") : null;
    if (tab) tab.opener = null;
    if (await markRead(item.id)) {
      if (tab) tab.location.replace(destination);
      else router.push(destination);
    } else tab?.close();
  }

  return <div className={styles.page}>
    <PageHeading title="Notifikasi" />
    <section className={styles.controls} aria-label="Filter notifikasi">
      <div className={styles.toolbar}>
        <SearchField initialValue="" onSearch={setSearch} label="Cari notifikasi" placeholder="Cari notifikasi, buku, atau transaksi..." />
        <PeriodSelector mode="transaction" label="Waktu notifikasi" value={period} onChange={setPeriod} />
      </div>
      <div className={styles.categoryBar}>
        <div className={styles.tabs} role="group" aria-label="Status baca notifikasi">
          {[["all", "Semua", all.length], ["unread", "Belum Dibaca", unread]].map(([value, label, count]) => <Button key={value} className={styles.chip} variant={filter === value ? "primary" : "secondary"} aria-pressed={filter === value} onClick={() => setFilter(String(value))}>
            {label}<span className={styles.count}>{resource.loading && !resource.data ? "…" : count}</span>
          </Button>)}
        </div>
        <Button className={styles.markAll} variant="secondary" icon={<FiCheck />} loading={busy === "all"} loadingLabel="Memperbarui..." disabled={resource.loading || Boolean(resource.error) || unread === 0 || busy !== null} onClick={() => void markRead()}>Tandai Semua Dibaca</Button>
      </div>
    </section>
    {actionError ? <p className={styles.feedback} role="alert">{actionError}</p> : null}
    <section className={styles.list} aria-label="Daftar notifikasi" aria-busy={resource.loading || busy !== null}>
      {resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message="Notifikasi belum dapat dimuat." retry={resource.reload} /> : !notifications.length ? <EmptyState message={filtered ? "Tidak ada notifikasi yang sesuai dengan pencarian atau filter." : filter === "all" ? "Belum ada notifikasi." : "Semua notifikasi sudah dibaca."} /> : notifications.map(item => {
        const destination = memberNotificationTarget(item);
        const content = <>
          <NotificationIcon type={item.entityType} />
          <div className={styles.body}>
            <h2>{item.title}</h2>
            <p>{item.message}</p>
            <div className={styles.meta}><time dateTime={item.createdAt}>{memberDate(item.createdAt, true)}</time><span className={`${styles.status} ${!item.readAt ? styles.statusUnread : ""}`}>{item.readAt ? "Dibaca" : "Belum Dibaca"}</span></div>
          </div>
          {destination ? <FiChevronRight className={styles.chevron} aria-hidden="true" /> : null}
        </>;
        const className = `${styles.row} ${!item.readAt ? styles.unread : ""}`;
        return destination ? <Link key={item.id} href={destination} className={className} data-notification-id={item.id}
          aria-label={`Buka detail: ${item.title}. ${item.message}`}
          aria-busy={busy === String(item.id)} aria-disabled={!item.readAt && busy !== null}
          onClick={event => {
            if (!item.readAt && (event.ctrlKey || event.metaKey || event.shiftKey)) { event.preventDefault(); void openNotification(item, true); }
          }}
          onAuxClick={event => {
            if (!item.readAt && event.button === 1) { event.preventDefault(); void openNotification(item, true); }
          }}
          onNavigate={event => { if (!item.readAt) { event.preventDefault(); void openNotification(item); } }}
          onKeyDown={event => { if (event.key === " ") { event.preventDefault(); if (!event.repeat) event.currentTarget.click(); } }}
        >{content}</Link> : <article key={item.id} className={className} data-notification-id={item.id}>{content}</article>;
      })}
    </section>
  </div>;
}
