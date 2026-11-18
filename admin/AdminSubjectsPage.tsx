'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { ManagedSubject } from './subjectCategories';
import { cleanedSubject } from './subjectCategories';
import styles from './AdminSubjects.module.css';

type SubjectResult = { categories: ManagedSubject[] };

async function apiMessage(response: Response, fallback: string) {
  try {
    const data = (await response.json()) as { message?: string };
    return typeof data.message === 'string' && data.message ? data.message : fallback;
  } catch {
    return fallback;
  }
}

export default function AdminSubjectsPage() {
  const [categories, setCategories] = useState<ManagedSubject[] | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [listOpen, setListOpen] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/members/admin/subjects', { cache: 'no-store', signal });
      if (!response.ok) throw new Error(await apiMessage(response, 'Daftar kategori belum dapat dimuat.'));
      const result = (await response.json()) as SubjectResult;
      if (!Array.isArray(result.categories)) throw new Error('Respons daftar kategori tidak valid.');
      if (!signal?.aborted) {
        setCategories(result.categories);
        setError('');
      }
    } catch (reason) {
      if (!signal?.aborted) {
        setCategories(null);
        setError(reason instanceof Error ? reason.message : 'Gagal memuat kategori.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    let normalized: string;
    try { normalized = cleanedSubject(name); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Nama kategori tidak valid.'); return; }
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/members/admin/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalized }),
      });
      if (!response.ok) throw new Error(await apiMessage(response, 'Kategori gagal ditambahkan.'));
      setName('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kategori gagal ditambahkan.');
    } finally { setSaving(false); }
  }

  async function remove(category: ManagedSubject) {
    if (removingId !== null || category.usageCount > 0) return;
    if (!window.confirm(`Hapus kategori "${category.name}"?`)) return;
    setRemovingId(category.id);
    setError('');
    try {
      const response = await fetch(`/api/members/admin/subjects/${category.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error(await apiMessage(response, 'Kategori gagal dihapus.'));
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kategori gagal dihapus.');
    } finally { setRemovingId(null); }
  }

  return (
    <section className={styles.page} aria-label="Kelola subjek dan kategori">
      <div className={styles.heading}>
        <h2>Subjek / Kategori</h2>
        <p>Kelola kategori buku fisik, e-book, dan Beranda.</p>
      </div>

      <form className={styles.addForm} onSubmit={add}>
        <label htmlFor="new-subject-name">Tambah kategori</label>
        <div className={styles.addRow}>
          <input
            id="new-subject-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            placeholder="Nama kategori baru"
            autoComplete="off"
            required
          />
          <button type="submit" data-button="primary" data-button-size="md" disabled={saving || loading}>
            {saving ? 'Menyimpan...' : 'Tambah Kategori'}
          </button>
        </div>
      </form>

      {error ? (
        <div className={styles.error} role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => void load()} disabled={loading}>
            Coba Lagi
          </button>
        </div>
      ) : null}

      <div className={styles.listSection}>
        <button
          type="button"
          className={styles.listToggle}
          aria-expanded={listOpen}
          aria-controls="managed-subject-list"
          onClick={() => setListOpen((current) => !current)}
        >
          <span className={styles.listToggleTitle}>Daftar Kategori</span>
          <span className={styles.listToggleMeta}>
            {loading ? 'Memuat...' : categories === null ? 'Tidak tersedia' : `${categories.length} kategori`}
          </span>
          <span className={`${styles.chevron} ${listOpen ? styles.chevronOpen : ''}`} aria-hidden="true" />
        </button>
        {listOpen ? (
          <div className={styles.listBody} id="managed-subject-list">
            {loading ? (
              <p className={styles.state}>Memuat kategori...</p>
            ) : categories === null ? (
              <p className={styles.state}>Kategori belum bisa dimuat. Periksa pesan di atas, lalu tekan Coba Lagi.</p>
            ) : categories.length ? (
              <>
                <ul className={styles.list}>
                  {categories.map((category) => (
                    <li className={styles.item} key={category.id}>
                      <div className={styles.itemInfo}>
                        <strong>{category.name}</strong>
                        <span>{category.usageCount} koleksi menggunakan kategori ini</span>
                      </div>
                      <button
                        type="button"
                        className={styles.remove}
                        disabled={category.usageCount > 0 || removingId !== null}
                        title={category.usageCount ? 'Ubah kategori pada buku yang terkait sebelum menghapus.' : `Hapus ${category.name}`}
                        onClick={() => void remove(category)}
                      >
                        {removingId === category.id ? 'Menghapus...' : category.usageCount ? 'Digunakan' : 'Hapus'}
                      </button>
                    </li>
                  ))}
                </ul>
                <p className={styles.hint}>Kategori yang masih dipakai buku tidak dapat dihapus. Ubah kategori buku terlebih dahulu.</p>
              </>
            ) : (
              <p className={styles.state}>Belum ada kategori. Tambahkan melalui formulir di atas.</p>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
