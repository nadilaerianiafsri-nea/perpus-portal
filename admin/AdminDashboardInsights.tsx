"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { FiAlertTriangle, FiBarChart2, FiBell, FiBox, FiCheckCircle, FiChevronRight, FiClock } from "react-icons/fi";
import { getChartGranularity } from "@/shared/chartTime.cjs";
import type { PeriodValue } from "@/shared/period";
import { adminOperationsApiMessage } from "./adminOperations";
import { dashboardActionItems, type DashboardActionRequired, type DashboardInsightsData, type TopBorrowedCollection } from "./dashboardInsights";
import styles from "./AdminDashboardInsights.module.css";

type SectionState = { loading?: boolean; failed?: boolean; onRetry: () => void };

function SectionFeedback({ loading, failed, onRetry }: SectionState) {
  if (loading) return <div className={styles.feedback} role="status"><span className={styles.srOnly}>Memuat data...</span><div className={styles.skeleton} /><div className={styles.skeleton} /><div className={styles.skeleton} /></div>;
  if (failed) return <div className={styles.feedback} role="alert"><FiAlertTriangle aria-hidden="true" /><p>Data belum dapat dimuat.</p><button data-button="secondary" data-button-size="sm" type="button" onClick={onRetry}>Coba Lagi</button></div>;
  return null;
}

export function TopBorrowedCollections({ collections, ...state }: SectionState & { collections?: TopBorrowedCollection[] | null }) {
  const maximum = Math.max(1, ...(collections ?? []).map(item => item.borrowCount));
  return <section className={styles.panel} aria-labelledby="top-borrowed-title" aria-busy={Boolean(state.loading)} data-dashboard-collections>
    <header className={styles.header}><h2 id="top-borrowed-title">Koleksi Paling Sering Dipinjam</h2><p>Berdasarkan seluruh riwayat peminjaman buku fisik</p></header>
    {state.loading || state.failed ? <SectionFeedback {...state} /> : collections?.length ? <ol className={styles.collectionList}>
      {collections.map(item => <li key={item.id}><Link data-record-card href={`/admin/koleksi/data-buku/${item.id}`} className={styles.collection} title={item.title} aria-label={`Lihat detail koleksi ${item.title}, ${item.borrowCount.toLocaleString("id-ID")} kali dipinjam`}>
        <span data-record-primary className={styles.collectionTitle}>{item.title}</span>
        <span className={styles.barTrack} aria-hidden="true"><span className={styles.bar} style={{ width: `${item.borrowCount / maximum * 100}%` }} /></span>
        <strong data-record-primary className={styles.count}>{item.borrowCount.toLocaleString("id-ID")} <span data-record-secondary>kali</span></strong>
      </Link></li>)}
    </ol> : <div className={styles.feedback}><FiBarChart2 aria-hidden="true" /><strong>Belum ada data peminjaman.</strong><p>Koleksi yang sudah dipinjam akan tampil di sini.</p></div>}
  </section>;
}

const actionIcons = { clock: FiClock, alert: FiAlertTriangle, box: FiBox, bell: FiBell };

export function AdminActionRequired({ actions, ...state }: SectionState & { actions?: DashboardActionRequired | null }) {
  const items = actions ? dashboardActionItems(actions) : [];
  return <section className={styles.panel} aria-labelledby="action-required-title" aria-busy={Boolean(state.loading)} data-dashboard-actions>
    <header className={styles.header}><h2 id="action-required-title">Memerlukan Tindakan</h2><p>Item yang membutuhkan perhatian Admin</p></header>
    {state.loading || state.failed ? <SectionFeedback {...state} /> : items.length ? <ul className={styles.actionList}>
      {items.map(item => { const Icon = actionIcons[item.icon as keyof typeof actionIcons]; return <li key={item.key}><Link data-record-card href={item.href} className={`${styles.action} ${styles[item.tone]}`} aria-label={`${item.count.toLocaleString("id-ID")} ${item.label}. ${item.detail}`}>
        <span className={styles.icon} aria-hidden="true"><Icon /></span>
        <span className={styles.actionCopy}><span data-record-primary><strong>{item.count.toLocaleString("id-ID")}</strong> {item.label}</span><small>{item.detail}</small></span>
        <FiChevronRight className={styles.chevron} aria-hidden="true" />
      </Link></li>; })}
    </ul> : <div className={styles.feedback}><FiCheckCircle className={styles.positive} aria-hidden="true" /><strong>Tidak ada tindakan yang perlu ditangani saat ini.</strong></div>}
  </section>;
}

type SectionKey = keyof DashboardInsightsData;

/** Reuses the initial dashboard response; retries affect only the chosen section. */
export default function AdminDashboardInsights({ data, loading, failed, period }: { data: DashboardInsightsData | null; loading: boolean; failed: boolean; period: PeriodValue }) {
  const [overrides, setOverrides] = useState<Partial<DashboardInsightsData>>({});
  const [retrying, setRetrying] = useState<Partial<Record<SectionKey, boolean>>>({});
  const controllers = useRef<Partial<Record<SectionKey, AbortController>>>({});

  useEffect(() => {
    const active = controllers.current;
    return () => { Object.values(active).forEach(controller => controller.abort()); };
  }, []);

  async function retry(section: SectionKey) {
    controllers.current[section]?.abort();
    const controller = new AbortController();
    controllers.current[section] = controller;
    setRetrying(previous => ({ ...previous, [section]: true }));
    try {
      const query = new URLSearchParams({ from: period.from, to: period.to, granularity: getChartGranularity(period, period.preset) });
      const response = await fetch(`/api/members/admin/operations/dashboard?${query}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(await adminOperationsApiMessage(response, "Data belum dapat dimuat."));
      const result = await response.json() as DashboardInsightsData;
      if (!controller.signal.aborted) setOverrides(previous => ({ ...previous, [section]: result[section] ?? null }));
    } catch {
      if (!controller.signal.aborted) setOverrides(previous => ({ ...previous, [section]: null }));
    } finally {
      if (!controller.signal.aborted) setRetrying(previous => ({ ...previous, [section]: false }));
    }
  }

  function state(section: SectionKey) {
    const overridden = Object.hasOwn(overrides, section);
    const value = overridden ? overrides[section] : data?.[section];
    return { value, loading: Boolean(retrying[section] || (!overridden && loading)), failed: value == null || (!overridden && failed) };
  }
  const top = state("topBorrowedCollections"), actions = state("actionRequired");
  return <div className={styles.grid}>
    <TopBorrowedCollections collections={top.value as TopBorrowedCollection[] | null | undefined} loading={top.loading} failed={top.failed} onRetry={() => void retry("topBorrowedCollections")} />
    <AdminActionRequired actions={actions.value as DashboardActionRequired | null | undefined} loading={actions.loading} failed={actions.failed} onRetry={() => void retry("actionRequired")} />
  </div>;
}
