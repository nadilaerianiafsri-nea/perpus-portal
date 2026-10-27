/* eslint-disable @next/next/no-img-element -- Authenticated local avatar URLs and temporary file previews use native image load/error events. */
"use client";

import { useState } from "react";
import { getInitials, profilePhotoUrl } from "../shared/memberAvatar.cjs";
import styles from "./MemberAvatar.module.css";

export default function MemberAvatar({ name, profileImageUrl, previewUrl, variant = "topbar", className = "", onImageLoad, onImageError }: {
  name?: string | null; profileImageUrl?: string | null; previewUrl?: string | null;
  variant?: "topbar" | "profile" | "panel"; className?: string;
  onImageLoad?: (source: string) => void; onImageError?: (source: string) => void;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const source = previewUrl?.startsWith("blob:") ? previewUrl : profilePhotoUrl(profileImageUrl);
  const visibleSource = source && source !== failedSource ? source : null;
  return <span className={`${styles.avatar} ${styles[variant]} ${className}`} data-member-avatar data-avatar-kind={variant}>
    <span className={styles.initials} aria-hidden={Boolean(visibleSource) || undefined} role={visibleSource ? undefined : "img"} aria-label={visibleSource ? undefined : `Inisial ${name?.trim() || "anggota"}`}>{getInitials(name)}</span>
    {visibleSource && <img key={visibleSource} src={visibleSource} className={styles.image} alt={`Foto profil ${name?.trim() || "anggota"}`} draggable={false}
      onLoad={() => onImageLoad?.(visibleSource)} onError={() => { setFailedSource(visibleSource); onImageError?.(visibleSource); }} />}
  </span>;
}
