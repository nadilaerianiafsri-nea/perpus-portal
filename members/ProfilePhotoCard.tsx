"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FiCamera, FiSave, FiTrash2 } from "react-icons/fi";
import { Button } from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { profilePhotoFileError } from "../shared/memberAvatar.cjs";
import { memberRequest } from "./api";
import { memberTypeLabels, type MemberProfile } from "./types";
import MemberAvatar from "./MemberAvatar";
import styles from "./ProfilePhotoCard.module.css";

export type ProfileMutation = { busy: boolean; begin: () => boolean; end: () => void };

export default function ProfilePhotoCard({ profile, onSaved, mutation }: { profile: MemberProfile; onSaved: (profile: MemberProfile) => Promise<void>; mutation: ProfileMutation }) {
  const input = useRef<HTMLInputElement>(null), locked = useRef(false), selectedSource = useRef<string | null>(null);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState<string | null>(null);
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false), [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(""), [notice, setNotice] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function discard() { selectedSource.current = null; setFile(null); setPreview(null); setReady(false); }
  function choose(event: ChangeEvent<HTMLInputElement>) {
    const chosen = event.target.files?.[0]; event.target.value = "";
    if (!chosen || locked.current) return;
    setError(""); setNotice(""); discard();
    const invalid = profilePhotoFileError(chosen);
    if (invalid) { setError(invalid); return; }
    const source = URL.createObjectURL(chosen); selectedSource.current = source;
    setFile(chosen); setPreview(source);
  }
  async function savePhoto() {
    if (!file || !ready || locked.current || !mutation.begin()) return;
    locked.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const form = new FormData(); form.append("photo", file);
      const result = await memberRequest<{ profile: MemberProfile }>("profile/photo", { method: "POST", body: form });
      await onSaved(result.profile); discard(); setNotice("Foto profil berhasil disimpan.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Foto profil gagal diunggah. Silakan coba lagi."); }
    finally { locked.current = false; setBusy(false); mutation.end(); }
  }
  async function removePhoto() {
    if (locked.current || !mutation.begin()) return;
    locked.current = true; setBusy(true); setError(""); setNotice("");
    try {
      const result = await memberRequest<{ profile: MemberProfile }>("profile/photo", { method: "DELETE" });
      await onSaved(result.profile); discard(); setConfirmDelete(false); setNotice("Foto profil berhasil dihapus.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Foto profil gagal dihapus. Silakan coba lagi."); }
    finally { locked.current = false; setBusy(false); mutation.end(); }
  }
  return <section className={styles.card} aria-label="Identitas dan foto profil" aria-busy={busy}>
    <MemberAvatar variant="profile" name={profile.name} profileImageUrl={profile.profileImageUrl} previewUrl={preview}
      onImageLoad={source => { if (source === selectedSource.current) setReady(true); }}
      onImageError={source => { if (source === selectedSource.current) { discard(); setError("Foto tidak dapat ditampilkan. Gunakan foto JPG, PNG, atau WEBP yang valid."); } }} />
    <div className={styles.identity}><h2>{profile.name}</h2><p>{profile.memberType ? memberTypeLabels[profile.memberType] : "Anggota"}</p>
      <div className={styles.actions}>
        {file ? <><Button icon={<FiSave />} disabled={!ready || mutation.busy} loading={busy} loadingLabel="Mengunggah..." onClick={savePhoto}>Simpan Foto</Button><Button variant="secondary" disabled={mutation.busy} onClick={() => { discard(); setError(""); }}>Batal</Button></> : <>
          <Button icon={<FiCamera />} disabled={mutation.busy} aria-label={profile.profileImageUrl ? "Ubah foto profil" : "Tambah foto profil"} onClick={() => input.current?.click()}>{profile.profileImageUrl ? "Ubah Foto" : "Tambah Foto"}</Button>
          {profile.profileImageUrl && <Button variant="secondary" rowAction="danger-soft" icon={<FiTrash2 />} disabled={mutation.busy} aria-label="Hapus foto profil" onClick={() => { setError(""); setConfirmDelete(true); }}>Hapus Foto</Button>}
        </>}
      </div>
      <input ref={input} className={styles.fileInput} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" disabled={mutation.busy} aria-label="Pilih foto profil" onChange={choose} />
      <p className={styles.helper}>JPG, PNG, atau WEBP · Maks. 5 MB</p>
      {preview && <p className={styles.helper}>Pratinjau foto. Pilih Simpan Foto untuk menerapkannya.</p>}
      {error && !confirmDelete && <p className={styles.error} role="alert">{error}</p>}
      {notice && <p className={styles.notice} role="status">{notice}</p>}
    </div>
    <ConfirmDialog open={confirmDelete} title="Hapus foto profil?" description="Foto profil akan dihapus dan avatar kembali menggunakan inisial nama." variant="danger" confirmLabel="Hapus Foto" cancelLabel="Batal" loadingLabel="Menghapus..." pending={busy} error={error} onConfirm={removePhoto} onCancel={() => { if (!locked.current) { setConfirmDelete(false); setError(""); } }} />
  </section>;
}
