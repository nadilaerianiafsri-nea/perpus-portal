"use client";
import RecordPagination, { type RecordPageSize } from "@/components/RecordPagination";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import type { ManagedSubject } from "./subjectCategories";
import { cleanedSubject } from "./subjectCategories";
import styles from "./AdminSubjects.module.css";

type SubjectResult = { categories: ManagedSubject[] };

async function apiMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string };
    return typeof data.message === "string" && data.message ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export default function AdminSubjectsPage() {
  const [categories, setCategories] = useState<ManagedSubject[] | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<RecordPageSize>(10);
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/members/admin/subjects", { cache: "no-store", signal });
      if (!response.ok) throw new Error(await apiMessage(response, "Daftar kategori belum dapat dimuat."));
      const result = (await response.json()) as SubjectResult;
      if (!Array.isArray(result.categories)) throw new Error("Respons daftar kategori tidak valid.");
      if (!signal?.aborted) {
        setCategories(result.categories);
        setError("");
      }
    } catch (reason) {
      if (!signal?.aborted) {
        setCategories(null);
        setError(reason instanceof Error ? reason.message : "Gagal memuat kategori.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Existing API loader synchronizes fetch/loading status.
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    let normalized: string;
    try {
      normalized = cleanedSubject(name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nama kategori tidak valid.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/members/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalized }),
      });
      if (!response.ok) throw new Error(await apiMessage(response, "Kategori gagal ditambahkan."));
      setName("");
      setPage(1);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kategori gagal ditambahkan.");
    } finally {
      setSaving(false);
    }
  }

  function beginEdit(category: ManagedSubject) {
    if (updating || removingId !== null) return;
    setEditingId(category.id);
    setEditName(category.name);
    setError("");
  }

  async function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingId === null || updating) return;
    let normalized: string;
    try {
      normalized = cleanedSubject(editName);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Nama kategori tidak valid.");
      return;
    }
    setUpdating(true);
    setError("");
    try {
      const response = await fetch("/api/members/admin/subjects/" + editingId, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: normalized }),
      });
      if (!response.ok) throw new Error(await apiMessage(response, "Kategori gagal diperbarui."));
      setEditingId(null);
      setEditName("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kategori gagal diperbarui.");
    } finally {
      setUpdating(false);
    }
  }

  async function remove(category: ManagedSubject) {
    if (removingId !== null || updating || category.usageCount > 0) return;
    if (!window.confirm("Hapus kategori " + '"' + category.name + '"?')) return;
    setRemovingId(category.id);
    setError("");
    try {
      const response = await fetch("/api/members/admin/subjects/" + category.id, { method: "DELETE" });
      if (!response.ok) throw new Error(await apiMessage(response, "Kategori gagal dihapus."));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kategori gagal dihapus.");
    } finally {
      setRemovingId(null);
    }
  }

  const filtered = categories?.filter((category) =>
    category.name.toLocaleLowerCase("id-ID").includes(searchInput.trim().toLocaleLowerCase("id-ID"))
  ) ?? [];
  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * limit, currentPage * limit);

  return (
    <section className={styles.page} aria-label="Kelola subjek dan kategori">
      <div className={styles.heading}>
        <div>
          <h1 data-page-title>Subjek / Kategori</h1>
          <p>Atur subjek yang digunakan buku fisik, e-book, dan Beranda.</p>
        </div>
        <Link href="/admin/pengaturan" data-button="back" data-button-size="md">
          Kembali ke Pengaturan
        </Link>
      </div>

      <form className={styles.addForm} onSubmit={(event) => void add(event)}>
        <label htmlFor="new-subject-name">Tambah kategori</label>
        <div className={styles.addRow}>
          <input
            id="new-subject-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            minLength={2}
            placeholder="Nama kategori baru"
            autoComplete="off"
            required
          />
          <button type="submit" data-button="primary" data-button-size="md" disabled={saving || loading}>
            {saving ? "Menyimpan..." : "Tambah Kategori"}
          </button>
        </div>
      </form>

      {error && (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <button type="button" data-button="secondary" onClick={() => void load()} disabled={loading}>
            Coba Lagi
          </button>
        </div>
      )}

      <div className={styles.listSection}>
        <div className={styles.listHeading}>
          <h2>Daftar Kategori</h2>
          <span>{loading ? "Memuat..." : categories === null ? "Tidak tersedia" : total + " kategori"}</span>
        </div>
        <div className={styles.searchArea}>
          <label htmlFor="category-list-search">Cari subjek / kategori</label>
          <input
            id="category-list-search"
            type="search"
            value={searchInput}
            placeholder="Cari nama kategori..."
            onChange={(event) => { setSearchInput(event.target.value); setPage(1); }}
            autoComplete="off"
          />
        </div>
        {loading ? (
          <p className={styles.state}>Memuat kategori...</p>
        ) : categories === null ? (
          <p className={styles.state}>Daftar kategori belum dapat dimuat. Gunakan Coba Lagi.</p>
        ) : categories.length === 0 ? (
          <p className={styles.state}>Belum ada kategori. Tambahkan melalui formulir di atas.</p>
        ) : (
          <>
            <div className={styles.tableHeading} aria-hidden="true">
              <span>Nama kategori</span>
              <span>Koleksi</span>
              <span>Aksi</span>
            </div>
            {filtered.length === 0 && (
              <p className={styles.state}>Tidak ada kategori yang sesuai dengan pencarian.</p>
            )}
            <ul className={styles.list}>
              {visible.map((category) => (
                <li className={styles.item} key={category.id}>
                  {editingId === category.id ? (
                    <form className={styles.editForm} onSubmit={(event) => void saveEdit(event)}>
                      <div className={styles.editField}>
                        <label htmlFor={"edit-category-" + category.id}>Edit nama kategori</label>
                        <input
                          id={"edit-category-" + category.id}
                          value={editName}
                          onChange={(event) => setEditName(event.target.value)}
                          maxLength={100}
                          minLength={2}
                          autoFocus
                          disabled={updating}
                          required
                        />
                        <small>Buku yang memakai kategori ini ikut diperbarui ketika nama diganti.</small>
                      </div>
                      <div className={styles.editActions}>
                        <button data-button="primary" type="submit" disabled={updating}>
                          {updating ? "Menyimpan..." : "Simpan"}
                        </button>
                        <button
                          data-button="secondary"
                          type="button"
                          onClick={() => { setEditingId(null); setError(""); }}
                          disabled={updating}
                        >
                          Kembali
                        </button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className={styles.itemInfo}>
                        <strong>{category.name}</strong>
                      </div>
                      <span className={styles.usage}>{category.usageCount} buku</span>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          data-button="secondary"
                          className={styles.actionButton}
                          onClick={() => beginEdit(category)}
                          disabled={editingId !== null || removingId !== null}
                          aria-label={"Edit kategori " + category.name}
                        >
                          <FiEdit2 aria-hidden="true" />
                          Edit
                        </button>
                        <button
                          type="button"
                          data-button="secondary"
                          className={styles.actionButton}
                          disabled={category.usageCount > 0 || removingId !== null || editingId !== null}
                          title={category.usageCount > 0 ? "Kategori masih digunakan buku." : "Hapus kategori"}
                          onClick={() => void remove(category)}
                          aria-label={"Hapus kategori " + category.name}
                        >
                          <FiTrash2 aria-hidden="true" />
                          {removingId === category.id ? "Menghapus..." : "Hapus"}
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
            <div className={styles.pagination}>
              <RecordPagination
                page={currentPage}
                pageSize={limit}
                total={total}
                totalPages={pageCount}
                onPageChange={setPage}
                onPageSizeChange={(next) => { setLimit(next); setPage(1); }}
                label="Halaman subjek atau kategori"
              />
            </div>
            <p className={styles.hint}>
              Kategori yang masih digunakan tidak dapat dihapus. Mengedit nama akan memperbarui buku terkait.
            </p>
          </>
        )}
      </div>
    </section>
  );
}
