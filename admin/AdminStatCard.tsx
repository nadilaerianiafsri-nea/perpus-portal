import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./AdminStatCard.module.css";

export type AdminStatTone = "dark" | "primary" | "slate" | "teal" | "info" | "success" | "danger" | "coral" | "warning" | "yellow";

type AdminStatCardProps = {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: AdminStatTone;
  detail?: string;
  href?: string;
  textValue?: boolean;
};

/** Shared presentation only: pages retain their values, links, and calculations. */
export default function AdminStatCard({ label, value, icon, tone, detail, href, textValue }: AdminStatCardProps) {
  const content = <>
    <span className={styles.icon} aria-hidden="true">{icon}</span>
    <div className={styles.body}>
      <span className={styles.label}>{label}</span>
      <strong className={`${styles.value} ${textValue ? styles.textValue : ""}`}>{value}</strong>
      {detail && <small className={styles.detail}>{detail}</small>}
    </div>
  </>;
  const className = `${styles.card} ${styles[tone]} ${href ? styles.clickable : ""}`;
  return href
    ? <Link href={href} className={className} data-admin-stat data-stat-tone={tone} aria-label={`${label}: ${value}. Buka halaman terkait.`}>{content}</Link>
    : <article className={className} data-admin-stat data-stat-tone={tone}>{content}</article>;
}
