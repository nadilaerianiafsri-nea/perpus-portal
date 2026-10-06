"use client";

import { useRef, useState } from "react";
import { FiSave, FiUser } from "react-icons/fi";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { Badge, ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import { initials } from "./format";
import { memberTypeLabels, type MemberProfile } from "./types";
import styles from "./Members.module.css";

function ProfileForm({ profile, onSaved }: { profile: MemberProfile; onSaved: (profile: MemberProfile) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const identityLabel = profile.memberType === "MAHASISWA" ? "NIM/KTM" : profile.memberType === "PEGAWAI" ? "Nomor Pegawai" : "NIK/KTP";
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const values = { name: String(form.get("name") ?? "").trim(), whatsapp: String(form.get("whatsapp") ?? "").trim(), address: String(form.get("address") ?? "").trim(), ...(profile.memberType === "MAHASISWA" ? { universityName: String(form.get("universityName") ?? "").trim() } : {}), ...(profile.memberType === "PEGAWAI" ? { workUnit: String(form.get("workUnit") ?? "").trim() } : {}) };
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try { const result = await memberRequest<{ profile: MemberProfile }>("profile", { method: "PATCH", body: JSON.stringify(values) }); setNotice("Profil berhasil diperbarui."); await onSaved(result.profile); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Profil belum dapat disimpan. Silakan coba lagi."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className={styles.card}><div className={styles.profileIntro}><span className={styles.avatar}>{initials(profile.name)}</span><div><h2>{profile.name}</h2><Badge>{profile.memberType ? memberTypeLabels[profile.memberType] : "Anggota"}</Badge></div><FiUser aria-hidden /></div><form className={styles.profileForm} onSubmit={save}>
    <label className={styles.field}><span>Nama Lengkap</span><input name="name" defaultValue={profile.name} required minLength={3} maxLength={191} autoComplete="name" /></label>
    <label className={styles.field}><span>Email</span><input value={profile.email} readOnly type="email" /><small>Email digunakan untuk autentikasi dan pengingat.</small></label>
    <label className={styles.field}><span>Nomor WhatsApp</span><input name="whatsapp" defaultValue={profile.whatsapp} type="tel" autoComplete="tel" required minLength={8} maxLength={32} /><small>Wajib diisi untuk pengingat peminjaman.</small></label>
    <label className={styles.field}><span>Jenis Anggota</span><input readOnly value={profile.memberType ? memberTypeLabels[profile.memberType] : "Anggota"} /></label>
    <label className={`${styles.field} ${styles.fullWidth}`}><span>Alamat</span><textarea name="address" defaultValue={profile.address} required maxLength={2000} autoComplete="street-address" rows={3} /></label>
    <label className={styles.field}><span>{identityLabel}</span><input value={profile.identityNumber} readOnly /></label>
    {profile.memberType === "MAHASISWA" && <label className={styles.field}><span>Perguruan Tinggi</span><input name="universityName" defaultValue={profile.universityName ?? ""} required maxLength={191} /></label>}
    {profile.memberType === "PEGAWAI" && <label className={styles.field}><span>Unit Kerja/Divisi</span><input name="workUnit" defaultValue={profile.workUnit ?? ""} required maxLength={191} /></label>}
    <div className={styles.fullWidth}>{error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.success} role="status">{notice}</p>}<button className={styles.button} type="submit" disabled={busy}><FiSave />{busy ? "Menyimpan..." : "Simpan Perubahan"}</button></div>
  </form></section>;
}
export default function ProfilePage() {
  const resource = useMemberResource<{ profile: MemberProfile }>("profile");
  const { refresh } = useMember();
  async function saved(profile: MemberProfile) { resource.update({ profile }); await refresh(); }
  return <div className={styles.pageStack}><PageHeading title="Profil Saya" description="Perbarui data kontak Anda agar pengingat perpustakaan dapat diterima." />{resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : resource.data && <ProfileForm profile={resource.data.profile} onSaved={saved} />}</div>;
}
