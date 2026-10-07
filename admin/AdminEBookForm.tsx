/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import {
  accessModeLabel,
  ebookApiMessage,
  type AdminEBookDetailResponse,
  type AdminEBookPayload,
  type EBookAccessMode,
} from "./adminEBooks";
import styles from "./AdminBooks.module.css";

type FormState = Omit<AdminEBookPayload, "year" | "accessDurationDays"> & {
  year: string;
  accessDurationDays: string;
};

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const COVER_PLACEHOLDER = "/images/landing/book-placeholder-1.svg";

const emptyForm: FormState = {
  code: "",
  title: "",
  author: "",
  isbnIssn: "",
  publisher: "",
  year: String(new Date().getFullYear()),
  edition: "",
  language: "Indonesia",
  subject: "",
  description: "",
  coverUrl: "",
  accessMode: "BACA_DI_WEBSITE",
  ebookUrl: "",
  accessDurationDays: "",
  licenseNote: "",
  isActive: true,
};

async function uploadCover(file: File): Promise<string> {
  const body = new FormData();
  body.append("cover", file);
  const response = await fetch("/api/admin/uploads/cover", { method: "POST", body });
  if (!response.ok) throw new Error(await ebookApiMessage(response, "Cover gagal diunggah."));
  const data = (await response.json()) as { coverUrl?: unknown };
  if (typeof data.coverUrl !== "string" || !data.coverUrl) throw new Error("Respons upload cover tidak valid.");
  return data.coverUrl;
}

export default function AdminEBookForm({ mode, id }: { mode: "create" | "edit"; id?: string }) {
  const router = useRouter();
  const coverInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
    };
  }, [coverPreview]);

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    const controller = new AbortController();
    fetch(`/api/admin/ebooks/${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await ebookApiMessage(response, "Data E-Book belum dapat dimuat."));
        return response.json() as Promise<AdminEBookDetailResponse>;
      })
      .then(({ book }) => {
        setForm({
          code: book.code,
          title: book.title,
          author: book.author,
          isbnIssn: book.isbnIssn ?? "",
          publisher: book.publisher,
          year: String(book.year),
          edition: book.edition ?? "",
          language: book.language,
          subject: book.subject,
          description: book.description,
          coverUrl: book.coverUrl,
          accessMode: book.accessMode,
          ebookUrl: book.ebookUrl ?? "",
          accessDurationDays: book.accessDurationDays ? String(book.accessDurationDays) : "",
          licenseNote: book.licenseNote ?? "",
          isActive: book.isActive,
        });
        setLoading(false);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : "Data E-Book belum dapat dimuat.");
        setLoading(false);
      });
    return () => controller.abort();
  }, [id, mode]);

  function update<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateAccessMode(value: EBookAccessMode) {
    setForm((current) => ({
      ...current,
      accessMode: value,
      ...(value === "TIDAK_TERSEDIA" ? { ebookUrl: "" } : {}),
    }));
  }

  function chooseCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (!COVER_TYPES.includes(file.type)) {
      setError("Format cover harus JPG, PNG, atau WEBP.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setError("Ukuran cover maksimal 5 MB.");
      event.target.value = "";
      return;
    }
    setError("");
    setCoverFile(file);
    setCoverPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const year = Number(form.year);
    const accessDurationDays = form.accessDurationDays.trim() ? Number(form.accessDurationDays) : null;
    if (!Number.isInteger(year)) {
      setError("Tahun Terbit harus berupa angka bulat.");
      return;
    }
    if (accessDurationDays !== null && (!Number.isInteger(accessDurationDays) || accessDurationDays < 1)) {
      setError("Durasi Akses harus berupa jumlah hari yang valid.");
      return;
    }
    if (form.accessMode !== "TIDAK_TERSEDIA" && !form.ebookUrl.trim()) {
      setError("URL / Sumber E-Book wajib diisi untuk mode akses ini.");
      return;
    }
    if (!coverFile && !form.coverUrl) {
      setError("Cover wajib diunggah.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const coverUrl = coverFile ? await uploadCover(coverFile) : form.coverUrl;
      const payload: AdminEBookPayload = {
        ...form,
        year,
        accessDurationDays,
        coverUrl,
      };
      const response = await fetch(
        mode === "create" ? "/api/admin/ebooks" : `/api/admin/ebooks/${id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(await ebookApiMessage(response, mode === "create" ? "E-Book gagal ditambahkan." : "Perubahan gagal disimpan."));
      }
      const result = (await response.json()) as AdminEBookDetailResponse;
      router.push(`/admin/koleksi/e-book/${result.book.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : mode === "create" ? "E-Book gagal ditambahkan." : "Perubahan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  const backHref = mode === "edit" && id ? `/admin/koleksi/e-book/${id}` : "/admin/koleksi/e-book";
  if (loading) return <div className={styles.statePanel}>Memuat data E-Book...</div>;

  return (
    <form className={styles.formPage} onSubmit={submit}>
      <div className={styles.formHeading}>
        <div>
          <div className={styles.localBreadcrumb}>
            <Link href="/admin/koleksi/e-book">E-Book</Link>
            <span>/</span>
            <strong>{mode === "create" ? "Tambah E-Book" : "Edit E-Book"}</strong>
          </div>
          <h1>{mode === "create" ? "Tambah E-Book" : "Edit E-Book"}</h1>
          <p>{mode === "create" ? "Tambahkan koleksi digital baru ke katalog perpustakaan." : `Memperbarui data ${form.code}. Perubahan langsung berlaku setelah disimpan.`}</p>
        </div>
        <Link href={backHref} className={styles.backButton}><FiArrowLeft aria-hidden />Kembali</Link>
      </div>

      {error ? <div className={styles.inlineError} role="alert">{error}</div> : null}

      <div className={styles.formLayout}>
        <div className={styles.formMain}>
          <section className={styles.formSection}>
            <div className={styles.sectionIntro}><h2>Identitas Koleksi</h2><p>Data bibliografi yang tampil di katalog publik.</p></div>
            <div className={styles.fieldsGrid}>
              <label><span>Kode E-Book <b>*</b></span><input value={form.code} onChange={(e) => update("code", e.target.value)} required maxLength={64} /></label>
              <label><span>Judul <b>*</b></span><input value={form.title} onChange={(e) => update("title", e.target.value)} required /></label>
              <label><span>Penulis / Pengarang <b>*</b></span><input value={form.author} onChange={(e) => update("author", e.target.value)} required /></label>
              <label><span>ISBN/ISSN</span><input value={form.isbnIssn} onChange={(e) => update("isbnIssn", e.target.value)} maxLength={64} /></label>
              <label><span>Penerbit <b>*</b></span><input value={form.publisher} onChange={(e) => update("publisher", e.target.value)} required /></label>
              <label><span>Tahun Terbit <b>*</b></span><input type="number" min="1000" max="9999" value={form.year} onChange={(e) => update("year", e.target.value)} required /></label>
              <label><span>Edisi</span><input value={form.edition} onChange={(e) => update("edition", e.target.value)} /></label>
              <label><span>Bahasa <b>*</b></span><input value={form.language} onChange={(e) => update("language", e.target.value)} required maxLength={64} /></label>
              <label className={styles.spanTwo}><span>Subjek / Kategori <b>*</b></span><input value={form.subject} onChange={(e) => update("subject", e.target.value)} required /></label>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionIntro}><h2>Akses Digital</h2><p>Atur cara anggota mengakses koleksi digital ini.</p></div>
            <div className={styles.fieldsGrid}>
              <label>
                <span>Mode Akses <b>*</b></span>
                <select value={form.accessMode} onChange={(e) => updateAccessMode(e.target.value as EBookAccessMode)} required>
                  <option value="BACA_DI_WEBSITE">{accessModeLabel("BACA_DI_WEBSITE")}</option>
                  <option value="PENYEDIA_EKSTERNAL">{accessModeLabel("PENYEDIA_EKSTERNAL")}</option>
                  <option value="TIDAK_TERSEDIA">{accessModeLabel("TIDAK_TERSEDIA")}</option>
                </select>
              </label>
              <label>
                <span>Durasi Akses (hari)</span>
                <input type="number" min="1" max="36500" value={form.accessDurationDays} onChange={(e) => update("accessDurationDays", e.target.value)} placeholder="Kosong = tidak dibatasi" />
              </label>
              <label className={styles.spanTwo}>
                <span>URL / Sumber E-Book {form.accessMode !== "TIDAK_TERSEDIA" ? <b>*</b> : null}</span>
                <input value={form.ebookUrl} onChange={(e) => update("ebookUrl", e.target.value)} disabled={form.accessMode === "TIDAK_TERSEDIA"} required={form.accessMode !== "TIDAK_TERSEDIA"} placeholder="https://..." />
              </label>
              <label className={styles.spanTwo}>
                <span>Catatan Lisensi</span>
                <textarea rows={4} value={form.licenseNote} onChange={(e) => update("licenseNote", e.target.value)} placeholder="Ketentuan akses atau lisensi jika ada" />
              </label>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionIntro}><h2>Deskripsi</h2><p>Ringkasan yang tampil di halaman detail E-Book.</p></div>
            <label className={styles.descriptionField}><span>Deskripsi <b>*</b></span><textarea rows={6} value={form.description} onChange={(e) => update("description", e.target.value)} required /></label>
          </section>
        </div>

        <aside className={styles.formAside}>
          <section className={styles.coverCard}>
            <h2>Cover</h2>
            <img src={coverPreview || form.coverUrl || COVER_PLACEHOLDER} alt="Preview cover E-Book" />
            <input ref={coverInput} type="file" accept="image/jpeg,image/png,image/webp" className={styles.coverFileInput} onChange={chooseCover} />
            <button type="button" className={styles.coverButton} onClick={() => coverInput.current?.click()}>{coverFile || form.coverUrl ? "Ganti Cover" : "Upload Cover"}</button>
            <small className={styles.coverHint}>JPG, PNG, atau WEBP · Maks. 5 MB</small>
            {coverFile ? <small className={styles.coverFileName}>{coverFile.name}</small> : null}
          </section>

          <section className={styles.catalogCard}>
            <label className={styles.toggleRow}>
              <div><strong>Tampilkan di katalog</strong><small>Menonaktifkan E-Book menyembunyikannya dari katalog tanpa menghapus data.</small></div>
              <input type="checkbox" checked={form.isActive} onChange={(e) => update("isActive", e.target.checked)} />
            </label>
            <span className={`${styles.pill} ${form.isActive ? styles.active : styles.inactive}`}>{form.isActive ? "Aktif" : "Nonaktif"}</span>
          </section>
        </aside>
      </div>

      <footer className={styles.formFooter}>
        <Link href={backHref} className={styles.cancelButton}>Batal</Link>
        <button type="submit" className={styles.saveButton} disabled={saving}>
          <FiCheckCircle aria-hidden />
          {saving ? "Menyimpan..." : mode === "create" ? "Simpan E-Book" : "Simpan Perubahan"}
        </button>
      </footer>
    </form>
  );
}
