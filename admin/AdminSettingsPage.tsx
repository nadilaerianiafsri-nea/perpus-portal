"use client";

import { ButtonLabel } from '@/components/Button';
import { showActionToast } from '@/components/ActionToast';
import { FormEvent, useCallback, useEffect, useState } from "react";
import {
  adminOperationsApiMessage,
  type LibrarySettings,
} from "./adminOperations";
import styles from "./AdminSettings.module.css";

type FormState = {
  libraryName: string;
  address: string;
  serviceHours: string;
  phoneLocal: string;
  reservationDurationHours: string;
  loanDurationDays: string;
  extensionDurationDays: string;
  maxExtensions: string;
};
export type Panel = "identitas" | "sirkulasi";

function toForm(settings: LibrarySettings): FormState {
  return {
    libraryName: settings.libraryName,
    address: settings.address,
    serviceHours: settings.serviceHours,
    phoneLocal: settings.phoneE164.replace(/^\+62/, ""),
    reservationDurationHours: String(settings.reservationDurationHours),
    loanDurationDays: String(settings.loanDurationDays),
    extensionDurationDays: String(settings.extensionDurationDays),
    maxExtensions: settings.maxExtensions === null ? "Tanpa batas" : String(settings.maxExtensions),
  };
}

function normalizeLocalPhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("62")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 13);
}

function integer(value: string, label: string, min: number, max: number) {
  if (!/^\d+$/.test(value)) throw new Error(`${label} harus berupa angka.`);
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) {
    throw new Error(`${label} harus berada pada rentang ${min}–${max}.`);
  }
  return number;
}

function payloadFromForm(form: FormState): LibrarySettings {
  const maxText = form.maxExtensions.trim();
  const maxExtensions = /^tanpa\s*batas$/i.test(maxText)
    ? null
    : integer(maxText, "Batas maksimal perpanjangan", 0, 100);
  if (form.libraryName.trim().length < 2 || form.libraryName.trim().length > 120) {
    throw new Error("Nama perpustakaan harus 2–120 karakter.");
  }
  if (form.address.trim().length < 5 || form.address.trim().length > 500) {
    throw new Error("Alamat perpustakaan harus 5–500 karakter.");
  }
  if (form.serviceHours.trim().length < 3 || form.serviceHours.trim().length > 80) {
    throw new Error("Jam layanan harus 3–80 karakter.");
  }
  if ([form.libraryName, form.address, form.serviceHours].some((value) => /[<>]/.test(value))) {
    throw new Error("Input teks tidak boleh berisi sintaks HTML.");
  }
  if (!/^8\d{7,12}$/.test(form.phoneLocal)) {
    throw new Error("Nomor kontak tidak valid. Masukkan nomor setelah +62, misalnya 8116904422.");
  }
  return {
    libraryName: form.libraryName.trim(),
    address: form.address.trim(),
    serviceHours: form.serviceHours.trim(),
    phoneE164: `+62${form.phoneLocal}`,
    reservationDurationHours: integer(form.reservationDurationHours, "Durasi reservasi", 1, 168),
    loanDurationDays: integer(form.loanDurationDays, "Durasi pinjam", 1, 365),
    extensionDurationDays: integer(form.extensionDurationDays, "Durasi perpanjangan", 1, 365),
    maxExtensions,
  };
}

export default function AdminSettingsPage({ activePanel }: { activePanel: Panel }) {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  const load = useCallback(async () => {
    void revision;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/members/admin/operations/settings", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error(
          await adminOperationsApiMessage(response, "Pengaturan belum dapat dimuat."),
        );
      }
      setForm(toForm((await response.json()) as LibrarySettings));
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Pengaturan belum dapat dimuat.";
      setError(message);
      showActionToast("error", message);
    } finally {
      setLoading(false);
    }
  }, [revision]);

  useEffect(() => {
    void load();
  }, [load]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form || saving || loading) return;
    setError("");

    let payload: LibrarySettings;
    try {
      payload = payloadFromForm(form);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Data pengaturan tidak valid.";
      setError(message);
      showActionToast("error", message);
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/members/admin/operations/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error(
          await adminOperationsApiMessage(response, "Pengaturan gagal disimpan."),
        );
      }
      const saved = (await response.json()) as LibrarySettings;
      setForm(toForm(saved));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pengaturan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
{error ? (
        <div className={styles.errorBox} role="alert">
          <span>{error}</span>
          <button data-button="secondary" data-button-size="md" type="button"
            onClick={() => setRevision((value) => value + 1)} disabled={loading}>Coba Lagi</button>
        </div>
      ) : null}

      {loading && !form ? (
        <div className={styles.loadingBox}>Memuat pengaturan...</div>
      ) : form ? (
        <form className={styles.form} onSubmit={save} noValidate>
{activePanel === "identitas" ? (
            <section className={`${styles.card} ${styles.animatedCard}`}>
              <div className={styles.cardHeading}>
                <h2>Informasi Perpustakaan</h2>
                <p>Identitas dan kontak yang ditampilkan kepada pengunjung.</p>
              </div>
              <div className={styles.formGrid}>
                <label className={styles.fullField}>
                  <span>Nama Perpustakaan</span>
                  <input value={form.libraryName} maxLength={120} onChange={(event) => update("libraryName", event.target.value)} />
                </label>
                <label className={styles.fullField}>
                  <span>Alamat</span>
                  <textarea rows={3} value={form.address} maxLength={500} onChange={(event) => update("address", event.target.value)} />
                </label>
                <label>
                  <span>Jam Layanan</span>
                  <input value={form.serviceHours} maxLength={80} onChange={(event) => update("serviceHours", event.target.value)} placeholder="08.00–15.00" />
                </label>
                <label>
                  <span>Kontak</span>
                  <div className={styles.phoneField}>
                    <span aria-hidden="true">+62</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      aria-label="Nomor kontak setelah kode negara +62"
                      value={form.phoneLocal}
                      onChange={(event) => update("phoneLocal", normalizeLocalPhone(event.target.value))}
                      onPaste={(event) => {
                        const pasted = event.clipboardData.getData("text");
                        if (pasted) {
                          event.preventDefault();
                          update("phoneLocal", normalizeLocalPhone(pasted));
                        }
                      }}
                      placeholder="8116904422"
                    />
                  </div>
                </label>
              </div>
            </section>
          ) : null}

          {activePanel === "sirkulasi" ? (
            <section className={`${styles.card} ${styles.animatedCard}`}>
              <div className={styles.cardHeading}>
                <h2>Aturan Reservasi</h2>
                <p>Tenggat pengambilan buku setelah anggota melakukan reservasi.</p>
              </div>
              <div className={styles.formGrid}>
                <label>
                  <span>Durasi Reservasi (jam)</span>
                  <input type="number" min={1} max={168} value={form.reservationDurationHours}
                    onChange={(event) => update("reservationDurationHours", event.target.value)} />
                  <small>Rentang yang diizinkan 1–168 jam.</small>
                </label>
              </div>
            </section>
          ) : null}

          {activePanel === "sirkulasi" ? (
            <section className={`${styles.card} ${styles.animatedCard}`}>
              <div className={styles.cardHeading}>
                <h2>Aturan Peminjaman</h2>
                <p>Durasi dan batas perpanjangan berlaku untuk transaksi berikutnya.</p>
              </div>
              <div className={styles.formGrid}>
                <label>
                  <span>Durasi Pinjam (hari)</span>
                  <input type="number" min={1} max={365} value={form.loanDurationDays}
                    onChange={(event) => update("loanDurationDays", event.target.value)} />
                </label>
                <label>
                  <span>Perpanjangan (hari)</span>
                  <input type="number" min={1} max={365} value={form.extensionDurationDays}
                    onChange={(event) => update("extensionDurationDays", event.target.value)} />
                </label>
                <label>
                  <span>Batas Maksimal Perpanjangan</span>
                  <input value={form.maxExtensions} onChange={(event) => update("maxExtensions", event.target.value)} placeholder="Tanpa batas" />
                  <small>Gunakan “Tanpa batas”, 0 untuk nonaktif, atau angka 1–100.</small>
                </label>
              </div>
              <div className={styles.infoBox}>
                Peran sistem menggunakan Admin Perpustakaan. Kebijakan denda tidak diaktifkan.
              </div>
            </section>
          ) : null}

          <div className={styles.actions}>
            <span className={styles.saveHint}>
              {activePanel === "sirkulasi"
                ? "Aturan berlaku untuk transaksi berikutnya."
                : "Perubahan identitas ditampilkan setelah disimpan."}
            </span>
            <button data-button="primary" data-button-size="md" data-button-loading={saving || loading}
              type="submit" disabled={saving || loading}>
              <ButtonLabel loading={saving} pending="Menyimpan...">Simpan Pengaturan</ButtonLabel>
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
