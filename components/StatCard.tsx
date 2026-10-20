import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";
import styles from "./StatCard.module.css";

export type StatTone = "dark" | "primary" | "slate" | "teal" | "info" | "success" | "danger" | "coral" | "warning" | "yellow";

export type StatCardProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone: StatTone;
  detail?: ReactNode;
  href?: string;
  textValue?: boolean;
  density?: "compact";
  children?: ReactNode;
};

/** Presentation only: callers keep their data, loading states, and destinations. */
export default function StatCard({ label, value, icon, tone, detail, href, textValue, density, children, className = "", ...attributes }: StatCardProps) {
  const classes = `${styles.card} ${styles[tone]} ${href ? styles.clickable : ""} ${density ? styles.compact : ""} ${className}`;
  const content = <>
    <span className={styles.icon} aria-hidden="true">{icon}</span>
    <div className={styles.body}>
      <span className={styles.label}>{label}</span>
      <strong className={`${styles.value} ${textValue ? styles.textValue : ""}`}>{value}</strong>
      {children}
      {detail != null && <small className={styles.detail}>{detail}</small>}
    </div>
  </>;
  return href
    ? <Link {...attributes} href={href} className={classes} data-stat-card data-stat-tone={tone}>{content}</Link>
    : <article {...attributes} className={classes} data-stat-card data-stat-tone={tone}>{content}</article>;
}
