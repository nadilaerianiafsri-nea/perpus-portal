import type { ReactNode } from "react";
import StatCard, { type StatTone } from "@/components/StatCard";

export type AdminStatTone = StatTone;

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
  return <StatCard label={label} value={value} icon={icon} tone={tone} detail={detail} href={href} textValue={textValue} data-admin-stat aria-label={href ? `${label}: ${value}. Buka halaman terkait.` : undefined} />;
}
