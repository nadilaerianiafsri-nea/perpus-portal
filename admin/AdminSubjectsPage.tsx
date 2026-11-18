"use client";
import RecordPagination, { type RecordPageSize } from "@/components/RecordPagination";

import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import { FiEdit2, FiTrash2 } from "react-icons/fi";

import type { ManagedSubject } from "./subjectCategories";
import { cleanedSubject } from "./subjectCategories";
import styles from "./AdminSubjects.module.css";
import memberStyles from "./AdminMembers.module.css";
import memberResponsive from "./AdminMembersResponsiveFix.module.css";

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
  const [deleteTarget, setDeleteTarget] = useState<ManagedSubject | null>(null);
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

  function requestDelete(category: ManagedSubject) {
    if (removingId !== null || updating || editingId !== null || category.usageCount > 0) return;
    setError("");
    setDeleteTarget(category);
  }

  async function remove() {
    if (!deleteTarget || removingId !== null || updating) return;
    const category = deleteTarget;
    setRemovingId(category.id);
    setError("");
    try {
      const response = await fetch("/api/members/admin/subjects/" + category.id, { method: "DELETE" });
      if (!response.ok) throw new Error(await apiMessage(response, "Kategori gagal dihapus."));
      await load();
      setDeleteTarget(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Kategori gagal dihapus.");
    } finally {
      setRemovingId(null);
    }
  }

  function editForm(id: string) {
    return (
      <form className={styles.editForm} onSubmit={(event) => void saveEdit(event)}>
        <div className={styles.editField}>
          <label htmlFor={id}>Edit nama kategori</label>
          <input
            id={id}
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            maxLength={100}
            minLength={2}
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
    );
  }

  function categoryActions(category: ManagedSubject) {
    return (
      <div className={`${memberStyles.actions} ${styles.categoryActions}`} data-record-action-group>
        <button
          type="button"
          data-button-shape="square"
          data-button="warning"
          data-button-size="sm"
          data-row-action="warning"
          className={memberStyles.editAction}
          onClick={() => beginEdit(category)}
          disabled={editingId !== null || removingId !== null}
          title="Edit kategori"
          aria-label={"Edit kategori " + category.name}
        >
          <FiEdit2 aria-hidden="true" />
        </button>
        <button
          type="button"
          data-button-shape="square"
          data-button="danger"
          data-button-size="sm"
          data-row-action="danger-soft"
          data-button-loading={removingId === category.id}
          aria-busy={removingId === category.id}
          className={memberStyles.disableAction}
          disabled={category.usageCount > 0 || removingId !== null || editingId !== null}
          title={category.usageCount > 0 ? "Kategori masih digunakan buku" : "Hapus kategori"}
          aria-label={"Hapus kategori " + category.name}
          onClick={() => requestDelete(category)}
        >
          <FiTrash2 aria-hidden="true" />
        </button>
      </div>
    );
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

      {error && !deleteTarget && (
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
          <input
            id="category-list-search"
            type="search"
            aria-label="Cari subjek atau kategori"
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
          <div className={memberStyles.tableCard}>
            <div className={`${memberStyles.tableScroller} ${memberResponsive.memberTableScroller}`}>
              <table className={`${memberStyles.table} ${styles.categoryTable}`} data-record-list>
                <thead>
                  <tr>
                    <th>NAMA KATEGORI</th>
                    <th>KOLEKSI</th>
                    <th data-record-actions="2">AKSI</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.length ? visible.map((category) => (
                    editingId === category.id ? (
                      <tr key={category.id}>
                        <td colSpan={3}>{editForm("edit-category-desktop-" + category.id)}</td>
                      </tr>
                    ) : (
                      <tr key={category.id}>
                        <td><div className={memberStyles.nameCell}><strong>{category.name}</strong></div></td>
                        <td>{category.usageCount} buku</td>
                        <td>{categoryActions(category)}</td>
                      </tr>
                    )
                  )) : (
                    <tr>
                      <td colSpan={3} className={memberStyles.stateCell}>
                        Tidak ada kategori yang sesuai dengan pencarian.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className={`${memberStyles.mobileList} ${memberResponsive.mobileMemberList}`}>
              {visible.length ? visible.map((category) => (
                <article
                  key={category.id}
                  className={`${memberStyles.mobileMemberCard} ${memberResponsive.mobileMemberCard}`}
                  data-record-card
                >
                  <div className={`${memberStyles.mobileCardHeading} ${memberResponsive.mobileCardHeading}`}>
                    <div><strong data-record-primary>{category.name}</strong></div>
                  </div>
                  {editingId === category.id ? (
                    <div className={styles.categoryMobileEdit}>
                      {editForm("edit-category-mobile-" + category.id)}
                    </div>
                  ) : (
                    <>
                      <dl className={`${memberStyles.mobileInfo} ${memberResponsive.mobileInfo}`}>
                        <div>
                          <dt>Koleksi</dt>
                          <dd data-record-primary>{category.usageCount} buku</dd>
                        </div>
                      </dl>
                      <div className={`${memberStyles.mobileActions} ${memberResponsive.mobileActions}`} data-record-action-group>
                        {categoryActions(category)}
                      </div>
                    </>
                  )}
                </article>
              )) : (
                <div className={memberStyles.mobileState}>
                  Tidak ada kategori yang sesuai dengan pencarian.
                </div>
              )}
            </div>

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
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Hapus Kategori?"
        description={`Kategori “${deleteTarget?.name ?? ""}” akan dihapus dari daftar kategori.`}
        variant="danger"
        confirmLabel="Hapus"
        loadingLabel="Menghapus..."
        pending={removingId !== null}
        error={error}
        onConfirm={remove}
        onCancel={() => {
          if (removingId === null) {
            setDeleteTarget(null);
            setError("");
          }
        }}
      />
    </section>
  );
}
