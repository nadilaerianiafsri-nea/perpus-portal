/* eslint-disable @next/next/no-img-element */
"use client";

import { adminCoverUrl } from "./adminBooks";
import { ButtonLabel } from "@/components/Button";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import {
  adminEBookTextError,
  ebookApiMessage,
  type AdminEBookDetailResponse,
  type AdminEBookPayload,
} from "./adminEBooks";
import SubjectCategorySelect from "./SubjectCategorySelect";
import styles from "./AdminBooks.module.css";
import enhancements from "./AdminBooksEnhancements.module.css";

type FormState = Omit<AdminEBookPayload, "year" | "accessDurationDays"> & {
  year: string;
  accessDurationDays: string;
};

const MAX_COVER_BYTES = 5 * 1024 * 1024;
const MAX_EBOOK_BYTES = 50 * 1024 * 1024;
const COVER_TYPES = ["image/jpeg", "image/png", "image/webp"];
const SUBJECT_CATEGORIES = [
  "Hukum",
  "Novel",
  "Pendidikan",
  "Sejarah",
  "Agama",
  "Teknologi",
  "Sosial",
  "Ekonomi",
  "Politik",
  "Pemerintahan",
  "Administrasi Kependudukan",
  "Kependudukan",
  "Biografi",
  "Sastra",
  "Referensi",
  "Anak",
  "Umum",
] as const;

const privateEBookSource =
  /^\/private-ebooks\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/;
const legacyPdfSource = /^\/ebooks\/[A-Za-z0-9_-]+\.pdf$/;

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

function normalizeYearInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function isStoredPdfSource(value: string) {
  return privateEBookSource.test(value) || legacyPdfSource.test(value);
}

async function uploadCover(file: File): Promise<string> {
  const body = new FormData();
  body.append("cover", file);
  const response = await fetch("/api/admin/uploads/cover", {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error(await ebookApiMessage(response, "Cover gagal diunggah."));
  }
  const data = (await response.json()) as { coverUrl?: unknown };
  if (typeof data.coverUrl !== "string" || !data.coverUrl) {
    throw new Error("Respons upload cover tidak valid.");
  }
  return data.coverUrl;
}

async function uploadEBook(file: File): Promise<string> {
  const body = new FormData();
  body.append("ebook", file);
  const response = await fetch("/api/admin/uploads/ebook", {
    method: "POST",
    body,
  });
  if (!response.ok) {
    throw new Error(
      await ebookApiMessage(response, "File E-Book gagal diunggah."),
    );
  }
  const data = (await response.json()) as { ebookUrl?: unknown };
  if (typeof data.ebookUrl !== "string" || !data.ebookUrl) {
    throw new Error("Respons upload E-Book tidak valid.");
  }
  return data.ebookUrl;
}

export default function AdminEBookForm({
  mode,
  id,
}: {
  mode: "create" | "edit";
  id?: string;
}) {
  const router = useRouter();
  const coverInput = useRef<HTMLInputElement>(null);
  const ebookInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState("");
  const [ebookFile, setEbookFile] = useState<File | null>(null);
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
    fetch(`/api/admin/ebooks/${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            await ebookApiMessage(response, "Data E-Book belum dapat dimuat."),
          );
        }
        return response.json() as Promise<AdminEBookDetailResponse>;
      })
      .then(({ book }) => {
        const storedPdf =
          typeof book.ebookUrl === "string" && isStoredPdfSource(book.ebookUrl)
            ? book.ebookUrl
            : "";

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
          accessMode: "BACA_DI_WEBSITE",
          ebookUrl: storedPdf,
          accessDurationDays: book.accessDurationDays
            ? String(book.accessDurationDays)
            : "",
          licenseNote: book.licenseNote ?? "",
          isActive: book.isActive,
        });
        setLoading(false);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Data E-Book belum dapat dimuat.",
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [id, mode]);

  function update<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  function chooseCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;
    if (
      !COVER_TYPES.includes(file.type) ||
      !/\.(?:jpe?g|png|webp)$/i.test(file.name)
    ) {
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

  function chooseEBook(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setEbookFile(null);
      return;
    }
    if (file.type !== "application/pdf" || !/\.pdf$/i.test(file.name)) {
      setError("Format file E-Book harus PDF.");
      event.target.value = "";
      setEbookFile(null);
      return;
    }
    if (file.size > MAX_EBOOK_BYTES) {
      setError("Ukuran file E-Book maksimal 50 MB.");
      event.target.value = "";
      setEbookFile(null);
      return;
    }
    setError("");
    setEbookFile(file);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const textError = adminEBookTextError(form);
    if (textError) {
      setError(textError);
      return;
    }
    if (
      !SUBJECT_CATEGORIES.includes(
        form.subject.trim() as (typeof SUBJECT_CATEGORIES)[number],
      )
    ) {
      setError("Pilih Subjek / Kategori dari daftar yang tersedia.");
      return;
    }

    const year = Number(form.year);
    const accessDurationDays = form.accessDurationDays.trim()
      ? Number(form.accessDurationDays)
      : null;
    if (!Number.isInteger(year) || year < 1000 || year > 9999) {
      setError("Tahun Terbit harus berupa angka 4 digit yang valid.");
      return;
    }
    if (
      accessDurationDays !== null &&
      (!Number.isInteger(accessDurationDays) || accessDurationDays < 1)
    ) {
      setError("Durasi Akses harus berupa jumlah hari yang valid.");
      return;
    }

    if (!ebookFile && !isStoredPdfSource(form.ebookUrl)) {
      setError("Pilih file PDF E-Book sebelum menyimpan.");
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
      const ebookUrl = ebookFile
        ? await uploadEBook(ebookFile)
        : form.ebookUrl;

      const payload: AdminEBookPayload = {
        ...form,
        year,
        accessDurationDays,
        coverUrl,
        accessMode: "BACA_DI_WEBSITE",
        ebookUrl,
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
        throw new Error(
          await ebookApiMessage(
            response,
            mode === "create"
              ? "E-Book gagal ditambahkan."
              : "Perubahan gagal disimpan.",
          ),
        );
      }
      const result = (await response.json()) as AdminEBookDetailResponse;
      router.push(`/admin/koleksi/e-book/${result.book.id}`);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : mode === "create"
            ? "E-Book gagal ditambahkan."
            : "Perubahan gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  const backHref =
    mode === "edit" && id
      ? `/admin/koleksi/e-book/${id}`
      : "/admin/koleksi/e-book";
  const subjectCategories =
    form.subject &&
    !SUBJECT_CATEGORIES.includes(
      form.subject as (typeof SUBJECT_CATEGORIES)[number],
    )
      ? [form.subject, ...SUBJECT_CATEGORIES]
      : SUBJECT_CATEGORIES;

  if (loading) {
    return <div className={styles.statePanel}>Memuat data E-Book...</div>;
  }

  return (
    <form className={styles.formPage} onSubmit={submit}>
      <div className={styles.formHeading}>
        <div>
          <div className={styles.localBreadcrumb}>
            <Link href="/admin/koleksi/e-book">E-Book</Link>
            <span>/</span>
            <strong>
              {mode === "create" ? "Tambah E-Book" : "Edit E-Book"}
            </strong>
          </div>
          <h1 data-page-title>
            {mode === "create" ? "Tambah E-Book" : "Edit E-Book"}
          </h1>
        </div>
        <Link
          data-button="back"
          data-button-size="md"
          href={backHref}
          className={styles.backButton}
        >
          <FiArrowLeft aria-hidden />
          Kembali
        </Link>
      </div>

      {error ? (
        <div className={styles.inlineError} role="alert">
          {error}
        </div>
      ) : null}

      <div className={styles.formLayout}>
        <div className={styles.formMain}>
          <section
            className={`${styles.formSection} ${enhancements.revisedCard}`}
          >
            <div className={styles.sectionIntro}>
              <h2>Identitas Koleksi</h2>
              <p>Data bibliografi yang tampil di katalog publik.</p>
            </div>
            <div className={styles.fieldsGrid}>
              <label>
                <span>
                  Kode E-Book <b>*</b>
                </span>
                <input
                  value={form.code}
                  onChange={(e) => update("code", e.target.value)}
                  required
                  maxLength={64}
                />
              </label>
              <label>
                <span>
                  Judul <b>*</b>
                </span>
                <input
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  required
                />
              </label>
              <label>
                <span>
                  Penulis / Pengarang <b>*</b>
                </span>
                <input
                  value={form.author}
                  onChange={(e) => update("author", e.target.value)}
                  required
                />
              </label>
              <label>
                <span>ISBN/ISSN</span>
                <input
                  value={form.isbnIssn}
                  onChange={(e) => update("isbnIssn", e.target.value)}
                  maxLength={64}
                />
              </label>
              <label>
                <span>
                  Penerbit <b>*</b>
                </span>
                <input
                  value={form.publisher}
                  onChange={(e) => update("publisher", e.target.value)}
                  required
                />
              </label>
              <label>
                <span>
                  Tahun Terbit <b>*</b>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  maxLength={4}
                  value={form.year}
                  onChange={(e) =>
                    update("year", normalizeYearInput(e.target.value))
                  }
                  onPaste={(event) => {
                    event.preventDefault();
                    update(
                      "year",
                      normalizeYearInput(event.clipboardData.getData("text")),
                    );
                  }}
                  autoComplete="off"
                  required
                />
              </label>
              <label>
                <span>Edisi</span>
                <input
                  value={form.edition}
                  onChange={(e) => update("edition", e.target.value)}
                />
              </label>
              <label>
                <span>
                  Bahasa <b>*</b>
                </span>
                <input
                  value={form.language}
                  onChange={(e) => update("language", e.target.value)}
                  required
                  maxLength={64}
                />
              </label>
              <div className={`${styles.spanTwo} ${styles.selectLabel}`}>
                <span>
                  Subjek / Kategori <b>*</b>
                </span>
                <SubjectCategorySelect
                  value={form.subject}
                  options={subjectCategories}
                  onChange={(value) => update("subject", value)}
                />
              </div>
            </div>
          </section>

          <section
            className={`${styles.formSection} ${enhancements.revisedCard}`}
          >
            <div className={styles.sectionIntro}>
              <h2>Akses Digital</h2>
              <p>
                Admin mengunggah file PDF yang dibaca anggota langsung melalui
                website.
              </p>
            </div>
            <div className={styles.fieldsGrid}>
              <label>
                <span>Mode Akses</span>
                <input value="Baca di Website (PDF)" readOnly disabled />
              </label>
              <label>
                <span>Durasi Akses (hari)</span>
                <input
                  type="number"
                  min="1"
                  max="36500"
                  value={form.accessDurationDays}
                  onChange={(e) =>
                    update("accessDurationDays", e.target.value)
                  }
                  placeholder="Kosong = tidak dibatasi"
                />
              </label>

              <label className={styles.spanTwo}>
                <span>
                  File E-Book PDF <b>*</b>
                </span>
                <input
                  ref={ebookInput}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={chooseEBook}
                  required={!ebookFile && !isStoredPdfSource(form.ebookUrl)}
                />
                <small className={styles.coverHint}>
                  PDF · Maks. 50 MB. File disimpan oleh sistem dan hanya dapat
                  dibaca melalui website sesuai aturan akses E-Book.
                </small>
                {ebookFile ? (
                  <small className={styles.coverFileName}>
                    {ebookFile.name}
                  </small>
                ) : isStoredPdfSource(form.ebookUrl) ? (
                  <small className={styles.coverFileName}>
                    File PDF E-Book sudah tersimpan. Pilih PDF baru hanya jika
                    ingin menggantinya.
                  </small>
                ) : mode === "edit" ? (
                  <small className={styles.coverFileName}>
                    Data lama belum menggunakan PDF internal. Upload PDF sebelum
                    menyimpan perubahan.
                  </small>
                ) : null}
              </label>

              <label className={styles.spanTwo}>
                <span>Catatan Lisensi</span>
                <textarea
                  rows={4}
                  value={form.licenseNote}
                  onChange={(e) => update("licenseNote", e.target.value)}
                  placeholder="Ketentuan akses atau lisensi jika ada"
                />
              </label>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionIntro}>
              <h2>Deskripsi</h2>
              <p>Ringkasan yang tampil di halaman detail E-Book.</p>
            </div>
            <label className={styles.descriptionField}>
              <span>
                Deskripsi <b>*</b>
              </span>
              <textarea
                rows={6}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                required
              />
            </label>
          </section>
        </div>

        <aside className={styles.formAside}>
          <section className={styles.coverCard}>
            <h2>Cover</h2>
            <img
              src={coverPreview || adminCoverUrl(form.coverUrl)}
              alt="Preview cover E-Book"
            />
            <input
              ref={coverInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={styles.coverFileInput}
              onChange={chooseCover}
            />
            <button
              data-button="secondary"
              data-button-size="md"
              type="button"
              className={styles.coverButton}
              onClick={() => coverInput.current?.click()}
            >
              {coverFile || form.coverUrl ? "Ganti Cover" : "Upload Cover"}
            </button>
            <small className={styles.coverHint}>
              JPG, PNG, atau WEBP · Maks. 5 MB
            </small>
            {coverFile ? (
              <small className={styles.coverFileName}>{coverFile.name}</small>
            ) : null}
          </section>

          <section className={styles.catalogCard}>
            <label className={styles.toggleRow}>
              <div>
                <strong>Tampilkan di katalog</strong>
                <small>
                  Menonaktifkan E-Book menyembunyikannya dari katalog tanpa
                  menghapus data.
                </small>
              </div>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update("isActive", e.target.checked)}
              />
            </label>
            <span
              className={`${styles.pill} ${form.isActive ? styles.active : styles.inactive}`}
            >
              {form.isActive ? "Aktif" : "Nonaktif"}
            </span>
          </section>
        </aside>
      </div>

      <footer className={styles.formFooter}>
        <Link
          data-button="ghost"
          data-button-size="md"
          href={backHref}
          className={styles.cancelButton}
        >
          Batal
        </Link>
        <button
          data-button="primary"
          data-button-size="md"
          data-button-loading={saving}
          type="submit"
          className={styles.saveButton}
          disabled={saving}
        >
          <FiCheckCircle aria-hidden />
          <ButtonLabel loading={saving} pending="Menyimpan...">
            {mode === "create" ? "Simpan E-Book" : "Simpan Perubahan"}
          </ButtonLabel>
        </button>
      </footer>
    </form>
  );
}
