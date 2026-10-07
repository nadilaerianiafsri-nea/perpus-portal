/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FiArrowLeft, FiCheckCircle } from "react-icons/fi";
import {
  apiMessage,
  type AdminBookDetailResponse,
  type AdminBookPayload,
} from "./adminBooks";
import styles from "./AdminBooks.module.css";

type FormState = Omit<AdminBookPayload, "year" | "totalStock"> & {
  year: string;
  totalStock: string;
};

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
  location: "",
  shelf: "",
  totalStock: "0",
  description: "",
  coverUrl: "/images/landing/book-placeholder-1.svg",
  isActive: true,
};

export default function AdminBookForm({
  mode,
  id,
}: {
  mode: "create" | "edit";
  id?: string;
}) {
  const router = useRouter();
  const coverInput = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [availableStock, setAvailableStock] = useState(0);
  const [loading, setLoading] = useState(mode === "edit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !id) return;
    const controller = new AbortController();

    fetch(`/api/admin/books/${encodeURIComponent(id)}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await apiMessage(response, "Data buku belum dapat dimuat."));
        }
        return response.json() as Promise<AdminBookDetailResponse>;
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
          location: book.location,
          shelf: book.shelf,
          totalStock: String(book.totalCopies),
          description: book.description,
          coverUrl: book.coverUrl,
          isActive: book.isActive,
        });
        setAvailableStock(book.availableCopies);
        setLoading(false);
      })
      .catch((reason) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof Error ? reason.message : "Data buku belum dapat dimuat.",
        );
        setLoading(false);
      });

    return () => controller.abort();
  }, [id, mode]);

  function update<K extends keyof FormState>(name: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const year = Number(form.year);
    const totalStock = Number(form.totalStock);
    if (!Number.isInteger(year) || !Number.isInteger(totalStock)) {
      setError("Tahun Terbit dan Jumlah Stok harus berupa angka bulat.");
      return;
    }

    const payload: AdminBookPayload = {
      ...form,
      year,
      totalStock,
    };

    setSaving(true);
    setError("");
    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/books" : `/api/admin/books/${id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) {
        throw new Error(
          await apiMessage(
            response,
            mode === "create" ? "Buku gagal ditambahkan." : "Perubahan gagal disimpan.",
          ),
        );
      }
      const result = (await response.json()) as AdminBookDetailResponse;
      router.push(`/admin/koleksi/data-buku/${result.book.id}`);
      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : mode === "create"
            ? "Buku gagal ditambahkan."
            : "Perubahan gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  const backHref =
    mode === "edit" && id
      ? `/admin/koleksi/data-buku/${id}`
      : "/admin/koleksi/data-buku";

  if (loading) {
    return <div className={styles.statePanel}>Memuat data buku...</div>;
  }

  return (
    <form className={styles.formPage} onSubmit={submit}>
      <div className={styles.formHeading}>
        <div>
          <div className={styles.localBreadcrumb}>
            <Link href="/admin/koleksi/data-buku">Data Buku</Link>
            <span>/</span>
            <strong>{mode === "create" ? "Tambah Buku" : "Edit Data Buku"}</strong>
          </div>
          <h1>{mode === "create" ? "Tambah Data Buku" : "Edit Data Buku"}</h1>
          <p>
            {mode === "create"
              ? "Tambahkan koleksi buku fisik baru ke katalog perpustakaan."
              : `Memperbarui data ${form.code}. Perubahan langsung berlaku di katalog setelah disimpan.`}
          </p>
        </div>
        <Link href={backHref} className={styles.backButton}>
          <FiArrowLeft aria-hidden />
          Kembali
        </Link>
      </div>

      {error ? <div className={styles.inlineError} role="alert">{error}</div> : null}

      <div className={styles.formLayout}>
        <div className={styles.formMain}>
          <section className={styles.formSection}>
            <div className={styles.sectionIntro}>
              <h2>Identitas Koleksi</h2>
              <p>Data bibliografi yang tampil di katalog publik.</p>
            </div>
            <div className={styles.fieldsGrid}>
              <label>
                <span>Kode Buku <b>*</b></span>
                <input value={form.code} onChange={(e) => update("code", e.target.value)} required maxLength={64} />
              </label>
              <label>
                <span>Judul <b>*</b></span>
                <input value={form.title} onChange={(e) => update("title", e.target.value)} required />
              </label>
              <label>
                <span>Penulis / Pengarang <b>*</b></span>
                <input value={form.author} onChange={(e) => update("author", e.target.value)} required />
              </label>
              <label>
                <span>ISBN/ISSN</span>
                <input value={form.isbnIssn} onChange={(e) => update("isbnIssn", e.target.value)} maxLength={64} />
              </label>
              <label>
                <span>Penerbit <b>*</b></span>
                <input value={form.publisher} onChange={(e) => update("publisher", e.target.value)} required />
              </label>
              <label>
                <span>Tahun Terbit <b>*</b></span>
                <input type="number" min="1000" max="9999" value={form.year} onChange={(e) => update("year", e.target.value)} required />
              </label>
              <label>
                <span>Edisi</span>
                <input value={form.edition} onChange={(e) => update("edition", e.target.value)} />
              </label>
              <label>
                <span>Bahasa <b>*</b></span>
                <input value={form.language} onChange={(e) => update("language", e.target.value)} required maxLength={64} />
              </label>
              <label className={styles.spanTwo}>
                <span>Subjek / Kategori <b>*</b></span>
                <input value={form.subject} onChange={(e) => update("subject", e.target.value)} required />
              </label>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionIntro}>
              <h2>Stok & Lokasi</h2>
              <p>Stok buku dikelola otomatis selama reservasi dan peminjaman.</p>
            </div>
            <div className={styles.fieldsGrid}>
              <label>
                <span>Lokasi <b>*</b></span>
                <input value={form.location} onChange={(e) => update("location", e.target.value)} required />
              </label>
              <label>
                <span>Rak <b>*</b></span>
                <input value={form.shelf} onChange={(e) => update("shelf", e.target.value)} required />
              </label>
              <label>
                <span>Jumlah Stok <b>*</b></span>
                <input type="number" min="0" max="9999" value={form.totalStock} onChange={(e) => update("totalStock", e.target.value)} required />
                <small>Eksemplar aktif tidak akan dihapus ketika sedang dipinjam atau direservasi.</small>
              </label>
              <label>
                <span>Stok Tersedia</span>
                <input value={mode === "create" ? "0" : String(availableStock)} readOnly disabled />
                <small>{mode === "create" ? "Dihitung setelah buku disimpan" : `Maksimal ${form.totalStock || "0"}`}</small>
              </label>
            </div>
          </section>

          <section className={styles.formSection}>
            <div className={styles.sectionIntro}>
              <h2>Deskripsi</h2>
              <p>Ringkasan yang tampil di halaman detail buku.</p>
            </div>
            <label className={styles.descriptionField}>
              <span>Deskripsi <b>*</b></span>
              <textarea rows={6} value={form.description} onChange={(e) => update("description", e.target.value)} required />
            </label>
          </section>
        </div>

        <aside className={styles.formAside}>
          <section className={styles.coverCard}>
            <h2>Cover</h2>
            <img src={form.coverUrl || "/images/landing/book-placeholder-1.svg"} alt="Preview cover buku" />
            <input
              ref={coverInput}
              className={styles.coverUrlInput}
              value={form.coverUrl}
              onChange={(e) => update("coverUrl", e.target.value)}
              placeholder="/images/... atau URL cover"
              aria-label="URL atau path cover"
              required
            />
            <button type="button" className={styles.coverButton} onClick={() => coverInput.current?.focus()}>
              Ganti Cover
            </button>
          </section>

          <section className={styles.catalogCard}>
            <label className={styles.toggleRow}>
              <div>
                <strong>Tampilkan di katalog</strong>
                <small>Menonaktifkan buku menyembunyikannya dari katalog tanpa menghapus data.</small>
              </div>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => update("isActive", e.target.checked)}
              />
            </label>
            <span className={`${styles.pill} ${form.isActive ? styles.active : styles.inactive}`}>
              {form.isActive ? "Aktif" : "Nonaktif"}
            </span>
          </section>
        </aside>
      </div>

      <footer className={styles.formFooter}>
        <Link href={backHref} className={styles.cancelButton}>Batal</Link>
        <button type="submit" className={styles.saveButton} disabled={saving}>
          <FiCheckCircle aria-hidden />
          {saving
            ? "Menyimpan..."
            : mode === "create"
              ? "Simpan Buku"
              : "Simpan Perubahan"}
        </button>
      </footer>
    </form>
  );
}
