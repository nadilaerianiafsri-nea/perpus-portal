"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  adminGrantApiMessage,
  type AdminGrantDetailResponse,
  type AdminGrantStatus,
} from "./adminGrants";
import styles from "./AdminGrants.module.css";

type Props = {
  mode: "create" | "edit";
  id?: string;
};

type FormItem = {
  key: string;
  title: string;
  quantity: string;
};

type FormState = {
  donorName: string;
  receivedAt: string;
  status: AdminGrantStatus;
  note: string;
  items: FormItem[];
};

function emptyItem(key = "item-1"): FormItem {
  return {
    key,
    title: "",
    quantity: "1",
  };
}

const initialForm: FormState = {
  donorName: "",
  receivedAt: "",
  status: "BELUM_DIKATALOGKAN",
  note: "",
  items: [emptyItem()],
};

export default function AdminGrantForm({ mode, id }: Props) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>(initialForm);

  const [loading, setLoading] = useState(mode === "edit");

  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    if (mode !== "edit" || !id) {
      return;
    }

    let active = true;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/admin/grants/${id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(
            await adminGrantApiMessage(
              response,
              "Data hibah belum dapat dimuat.",
            ),
          );
        }

        const payload = (await response.json()) as AdminGrantDetailResponse;

        if (!active) {
          return;
        }

        setForm({
          donorName: payload.grant.donorName,

          receivedAt: payload.grant.receivedAt.slice(0, 10),

          status: payload.grant.status,

          note: payload.grant.note ?? "",

          items: payload.grant.items.map((item) => ({
            key: `item-${item.id}`,
            title: item.title,
            quantity: String(item.quantity),
          })),
        });
      } catch (reason) {
        if (!active) {
          return;
        }

        setError(
          reason instanceof Error
            ? reason.message
            : "Data hibah belum dapat dimuat.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [id, mode]);

  function updateItem(key: string, field: "title" | "quantity", value: string) {
    setForm((current) => ({
      ...current,

      items: current.items.map((item) =>
        item.key === key
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    }));
  }

  function addItem() {
    if (form.items.length >= 100) {
      return;
    }

    setForm((current) => ({
      ...current,

      items: [
        ...current.items,

        emptyItem(`item-${Date.now()}-${Math.random()}`),
      ],
    }));
  }

  function removeItem(key: string) {
    if (form.items.length <= 1) {
      return;
    }

    setForm((current) => ({
      ...current,

      items: current.items.filter((item) => item.key !== key),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving) {
      return;
    }

    const items = form.items.map((item) => ({
      title: item.title.trim(),

      quantity: Number(item.quantity),
    }));

    if (
      items.some(
        (item) =>
          !item.title ||
          !Number.isSafeInteger(item.quantity) ||
          item.quantity < 1,
      )
    ) {
      setError(
        "Pastikan seluruh judul dan jumlah buku sudah diisi dengan benar.",
      );

      return;
    }

    setSaving(true);
    setError("");

    try {
      const target =
        mode === "create" ? "/api/admin/grants" : `/api/admin/grants/${id}`;

      const response = await fetch(target, {
        method: mode === "create" ? "POST" : "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          donorName: form.donorName.trim(),

          receivedAt: form.receivedAt,

          status: form.status,

          note: form.note.trim() || null,

          items,
        }),
      });

      if (!response.ok) {
        throw new Error(
          await adminGrantApiMessage(response, "Data hibah gagal disimpan."),
        );
      }

      const payload = (await response.json()) as AdminGrantDetailResponse;

      router.push(`/admin/hibah-buku/${payload.grant.id}`);

      router.refresh();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Data hibah gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className={styles.statePanel}>Memuat data hibah...</div>;
  }

  const cancelHref =
    mode === "edit" && id ? `/admin/hibah-buku/${id}` : "/admin/hibah-buku";

  return (
    <div className={styles.formPage}>
      <header className={styles.detailHeading}>
        <div>
          <div className={styles.localBreadcrumb}>
            <Link href="/admin/hibah-buku">Hibah Buku</Link>

            <span>/</span>

            <strong>{mode === "create" ? "Tambah Data" : "Edit Data"}</strong>
          </div>

          <h1>{mode === "create" ? "Tambah Data Hibah" : "Edit Data Hibah"}</h1>

          <p>Satu penerimaan dapat berisi satu atau beberapa judul buku.</p>
        </div>

        <Link href={cancelHref} className={styles.secondaryButton}>
          Kembali
        </Link>
      </header>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <p>{error}</p>
        </div>
      ) : null}

      <form onSubmit={submit}>
        <section className={styles.formSection}>
          <h2>Informasi Penerimaan</h2>

          <p className={styles.formIntro}>
            Catat pihak pemberi, tanggal buku diterima, dan status
            katalogisasinya.
          </p>

          <div className={styles.formGrid}>
            <label className={styles.field}>
              <span>
                Asal / Pemberi Hibah <b>*</b>
              </span>

              <input
                type="text"
                required
                maxLength={191}
                value={form.donorName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    donorName: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>
                Tanggal Penerimaan <b>*</b>
              </span>

              <input
                type="date"
                required
                value={form.receivedAt}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    receivedAt: event.target.value,
                  }))
                }
              />
            </label>

            <label className={styles.field}>
              <span>
                Status Katalogisasi <b>*</b>
              </span>

              <select
                value={form.status}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    status: event.target.value as AdminGrantStatus,
                  }))
                }
              >
                <option value="BELUM_DIKATALOGKAN">Belum Dikatalogkan</option>

                <option value="SUDAH_DIKATALOGKAN">Sudah Dikatalogkan</option>
              </select>
            </label>

            <label className={styles.fullField}>
              <span>Catatan</span>

              <textarea
                maxLength={3000}
                value={form.note}
                placeholder="Catatan tambahan mengenai penerimaan hibah (opsional)."
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    note: event.target.value,
                  }))
                }
              />

              <small>Opsional, maksimal 3000 karakter.</small>
            </label>
          </div>
        </section>

        <section
          className={styles.formSection}
          style={{
            marginTop: "15px",
          }}
        >
          <h2>Daftar Buku Hibah</h2>

          <p className={styles.formIntro}>
            Masukkan setiap judul beserta jumlah eksemplar yang diterima.
          </p>

          <div className={styles.itemsEditor}>
            {form.items.map((item, index) => (
              <div key={item.key} className={styles.itemRow}>
                <label className={styles.itemField}>
                  <span>Judul Buku {index + 1}</span>

                  <input
                    type="text"
                    required
                    maxLength={191}
                    value={item.title}
                    onChange={(event) =>
                      updateItem(item.key, "title", event.target.value)
                    }
                  />
                </label>

                <label className={styles.itemField}>
                  <span>Jumlah</span>

                  <input
                    type="number"
                    required
                    min={1}
                    max={100000}
                    step={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateItem(item.key, "quantity", event.target.value)
                    }
                  />
                </label>

                <button
                  type="button"
                  className={styles.removeButton}
                  disabled={form.items.length <= 1}
                  onClick={() => removeItem(item.key)}
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className={styles.addItemButton}
            style={{
              marginTop: "10px",
            }}
            disabled={form.items.length >= 100}
            onClick={addItem}
          >
            + Tambah Judul Buku
          </button>
        </section>

        <footer
          className={styles.formFooter}
          style={{
            marginTop: "15px",
          }}
        >
          <Link href={cancelHref} className={styles.secondaryButton}>
            Batal
          </Link>

          <button
            type="submit"
            className={styles.primaryButton}
            disabled={saving}
          >
            {saving ? "Menyimpan..." : "Simpan Data Hibah"}
          </button>
        </footer>
      </form>
    </div>
  );
}
