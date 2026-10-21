"use client";

import { ButtonLabel } from '@/components/Button';
import { useRef, useState } from "react";
import { FiSave, FiUser } from "react-icons/fi";
import { memberRequest, useMemberResource } from "./api";
import { useMember } from "./MemberContext";
import { Badge, ErrorState, LoadingCards, PageHeading } from "./MemberUI";
import { initials } from "./format";
import { memberTypeLabels, type MemberProfile } from "./types";
import styles from "./Members.module.css";
import { plainTextMessage } from "./inputSecurity";

function ProfileForm({ profile, onSaved }: { profile: MemberProfile; onSaved: (profile: MemberProfile) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  function checkField(event: React.FormEvent<HTMLFormElement>) {
    const field = event.target;
    if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || !field.name || field.readOnly) return;
    const message = plainTextMessage(field.value, field.maxLength, field instanceof HTMLTextAreaElement);
    field.setCustomValidity(message);
    setFieldErrors(current => ({ ...current, [field.name]: message }));
  }
  function feedback(name: string) { return fieldErrors[name] ? <small id={`profile-${name}-error`} role="alert">{fieldErrors[name]}</small> : null; }
  const identityLabel = profile.memberType === "MAHASISWA" ? "NIM/KTM" : profile.memberType === "PEGAWAI" ? "Nomor Pegawai" : "NIK/KTP";
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending.current) return;
    const form = new FormData(event.currentTarget);
    const values = { name: String(form.get("name") ?? "").trim(), whatsapp: String(form.get("whatsapp") ?? "").trim(), address: String(form.get("address") ?? "").trim(), ...(profile.memberType === "MAHASISWA" ? { universityName: String(form.get("universityName") ?? "").trim() } : {}), ...(profile.memberType === "PEGAWAI" ? { workUnit: String(form.get("workUnit") ?? "").trim() } : {}) };
    const errors = Object.fromEntries(Object.entries(values).map(([name, value]) => [name, plainTextMessage(value, name === "address" ? 2000 : name === "whatsapp" ? 32 : 191, name === "address")]));
    setFieldErrors(errors);
    if (Object.values(errors).some(Boolean)) return;
    pending.current = true; setBusy(true); setError(""); setNotice("");
    try { const result = await memberRequest<{ profile: MemberProfile }>("profile", { method: "PATCH", body: JSON.stringify(values) }); setNotice("Profil berhasil diperbarui."); await onSaved(result.profile); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Profil belum dapat disimpan. Silakan coba lagi."); }
    finally { pending.current = false; setBusy(false); }
  }
  return <section className={styles.card}><div className={styles.profileIntro}><span className={styles.avatar}>{initials(profile.name)}</span><div><h2>{profile.name}</h2><Badge>{profile.memberType ? memberTypeLabels[profile.memberType] : "Anggota"}</Badge></div><FiUser aria-hidden /></div><form className={styles.profileForm} onSubmit={save} onInput={checkField}>
    <label className={styles.field}><span>Nama Lengkap</span><input name="name" aria-invalid={Boolean(fieldErrors.name)} aria-describedby={fieldErrors.name ? "profile-name-error" : undefined} defaultValue={profile.name} required minLength={3} maxLength={191} autoComplete="name" />{feedback("name")}</label>
    <label className={styles.field}><span>Email</span><input value={profile.email} readOnly type="email" /><small>Email digunakan untuk autentikasi dan pengingat.</small></label>
    <label className={styles.field}><span>Nomor WhatsApp</span><input name="whatsapp" aria-invalid={Boolean(fieldErrors.whatsapp)} aria-describedby={fieldErrors.whatsapp ? "profile-whatsapp-error" : undefined} defaultValue={profile.whatsapp} type="tel" autoComplete="tel" required minLength={8} maxLength={32} />{feedback("whatsapp")}<small>Wajib diisi untuk pengingat peminjaman.</small></label>
    <label className={styles.field}><span>Jenis Anggota</span><input readOnly value={profile.memberType ? memberTypeLabels[profile.memberType] : "Anggota"} /></label>
    <label className={`${styles.field} ${styles.fullWidth}`}><span>Alamat</span><textarea name="address" aria-invalid={Boolean(fieldErrors.address)} aria-describedby={fieldErrors.address ? "profile-address-error" : undefined} defaultValue={profile.address} required maxLength={2000} autoComplete="street-address" rows={3} />{feedback("address")}</label>
    <label className={styles.field}><span>{identityLabel}</span><input value={profile.identityNumber} readOnly /></label>
    {profile.memberType === "MAHASISWA" && <label className={styles.field}><span>Perguruan Tinggi</span><input name="universityName" aria-invalid={Boolean(fieldErrors.universityName)} aria-describedby={fieldErrors.universityName ? "profile-universityName-error" : undefined} defaultValue={profile.universityName ?? ""} required maxLength={191} />{feedback("universityName")}</label>}
    {profile.memberType === "PEGAWAI" && <label className={styles.field}><span>Unit Kerja/Divisi</span><input name="workUnit" aria-invalid={Boolean(fieldErrors.workUnit)} aria-describedby={fieldErrors.workUnit ? "profile-workUnit-error" : undefined} defaultValue={profile.workUnit ?? ""} required maxLength={191} />{feedback("workUnit")}</label>}
    <div className={styles.fullWidth}>{error && <p className={styles.error} role="alert">{error}</p>}{notice && <p className={styles.success} role="status">{notice}</p>}<button data-button="primary" data-button-loading={busy} aria-busy={busy} className={styles.button} type="submit" disabled={busy}><FiSave /><ButtonLabel loading={busy} pending="Menyimpan...">Simpan Perubahan</ButtonLabel></button></div>
  </form></section>;
}
export default function ProfilePage() {
  const resource = useMemberResource<{ profile: MemberProfile }>("profile");
  const { refresh } = useMember();
  async function saved(profile: MemberProfile) { resource.update({ profile }); await refresh(); }
  return <div className={styles.pageStack}><PageHeading title="Profil Saya" />{resource.loading ? <LoadingCards /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : resource.data && <ProfileForm profile={resource.data.profile} onSaved={saved} />}</div>;
}
