"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { PublicContent } from "@/information/publicContentTypes";
import styles from "./AdminSettings.module.css";

type ContentSection = "home" | "about" | "guide" | "faq" | "contact";
type HomeKey = keyof PublicContent["home"];

type HomeField = { key: HomeKey; label: string; multiline?: boolean };
const homeFields: HomeField[] = [
  { key: "heroTitle", label: "Judul Hero", multiline: true },
  { key: "heroDescription", label: "Deskripsi Hero", multiline: true },
  { key: "latestTitle", label: "Judul Koleksi Terbaru" },
  { key: "latestDescription", label: "Deskripsi Koleksi Terbaru", multiline: true },
  { key: "subjectsTitle", label: "Judul Subjek" },
  { key: "subjectsDescription", label: "Deskripsi Subjek", multiline: true },
  { key: "servicesTitle", label: "Judul Layanan" },
  { key: "servicesDescription", label: "Deskripsi Layanan", multiline: true },
  { key: "borrowingTitle", label: "Judul Alur Peminjaman" },
  { key: "borrowingDescription", label: "Deskripsi Alur Peminjaman", multiline: true },
  { key: "ebookTitle", label: "Judul E-Book" },
  { key: "ebookDescription", label: "Deskripsi E-Book", multiline: true },
  { key: "reminderTitle", label: "Judul Reminder" },
  { key: "reminderDescription", label: "Deskripsi Reminder", multiline: true },
  { key: "grantsTitle", label: "Judul Hibah" },
  { key: "grantsDescription", label: "Deskripsi Hibah", multiline: true },
  { key: "membershipTitle", label: "Judul Keanggotaan" },
  { key: "membershipDescription", label: "Deskripsi Keanggotaan", multiline: true },
  { key: "informationTitle", label: "Judul Informasi Layanan" },
];

const tokenHint =
  "Token yang tersedia: {libraryName}, {reservationDurationHours}, {loanDurationDays}, {extensionDurationDays}, {maxExtensionsText}.";

type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
  full?: boolean;
};

function TextInput({ label, value, onChange, multiline, rows = 3, full }: TextInputProps) {
  return (
    <label className={full || multiline ? styles.fullField : undefined}>
      <span>{label}</span>
      {multiline ? (
        <textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

async function apiMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = await response.json() as { message?: unknown };
    if (typeof body.message === "string" && body.message.trim()) return body.message;
    if (Array.isArray(body.message)) {
      const messages = body.message.filter((item): item is string => typeof item === "string");
      if (messages.length) return messages.join(". ");
    }
  } catch {
    // A failed request can have no JSON body.
  }
  return fallback;
}

export default function AdminPublicContentPage({ activeSection }: { activeSection: ContentSection }) {
  const [content, setContent] = useState<PublicContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/members/admin/public-content", { cache: "no-store" });
      if (!response.ok) {
        throw new Error(await apiMessage(response, "Konten publik belum dapat dimuat."));
      }
      setContent((await response.json()) as PublicContent);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Konten publik belum dapat dimuat.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function mutate(update: (draft: PublicContent) => void) {
    setContent((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      update(next);
      return next;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/members/admin/public-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      if (!response.ok) {
        throw new Error(await apiMessage(response, "Konten publik gagal disimpan."));
      }
      setContent((await response.json()) as PublicContent);
      // The global ActionToast confirms successful PATCH requests.
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Konten publik gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !content) return <div className={styles.loadingBox}>Memuat konten publik...</div>;

  return (
    <div className={styles.page}>
      {error ? (
        <div className={styles.errorBox} role="alert">
          <span>{error}</span>
          {!content ? <button type="button" onClick={() => void load()}>Coba Lagi</button> : null}
        </div>
      ) : null}
      {content ? (
        <form className={styles.form} onSubmit={save}>
          {activeSection === "home" ? (
            <section className={`${styles.card} ${styles.animatedCard}`}>
              <div className={styles.cardHeading}>
                <h2>Beranda</h2>
                <p>Gambar hero, warna, icon, dan layout utama tetap dikelola oleh design system.</p>
              </div>
              <div className={styles.formGrid}>
                {homeFields.map((field) => (
                  <TextInput
                    key={field.key}
                    label={field.label}
                    value={content.home[field.key]}
                    multiline={field.multiline}
                    onChange={(value) => mutate((draft) => { draft.home[field.key] = value; })}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "about" ? (
            <section className={`${styles.card} ${styles.animatedCard}`}>
              <div className={styles.cardHeading}><h2>Tentang</h2></div>
              <div className={styles.formGrid}>
                <TextInput label="Judul" value={content.about.title}
                  onChange={(value) => mutate((draft) => { draft.about.title = value; })} />
                <TextInput label="Intro" value={content.about.intro} multiline
                  onChange={(value) => mutate((draft) => { draft.about.intro = value; })} />
                {content.about.features.map((item, index) => (
                  <label className={styles.fullField} key={`about-${index}`}>
                    <span>Fitur {index + 1}</span>
                    <input value={item.title} onChange={(event) => mutate((draft) => {
                      draft.about.features[index].title = event.target.value;
                    })} />
                    <textarea rows={2} value={item.description} onChange={(event) => mutate((draft) => {
                      draft.about.features[index].description = event.target.value;
                    })} />
                  </label>
                ))}
                <TextInput label="Judul Visi" value={content.about.visionTitle}
                  onChange={(value) => mutate((draft) => { draft.about.visionTitle = value; })} />
                <TextInput label="Isi Visi" value={content.about.visionText} multiline
                  onChange={(value) => mutate((draft) => { draft.about.visionText = value; })} />
              </div>
            </section>
          ) : null}

          {activeSection === "guide" ? (
            <section className={`${styles.card} ${styles.animatedCard}`}>
              <div className={styles.cardHeading}><h2>Panduan</h2><p>{tokenHint}</p></div>
              <div className={styles.formGrid}>
                <TextInput label="Judul" value={content.guide.title}
                  onChange={(value) => mutate((draft) => { draft.guide.title = value; })} />
                <TextInput label="Intro" value={content.guide.intro} multiline rows={2}
                  onChange={(value) => mutate((draft) => { draft.guide.intro = value; })} />
                {content.guide.steps.map((item, index) => (
                  <label className={styles.fullField} key={`guide-${index}`}>
                    <span>Langkah {index + 1}</span>
                    <input value={item.title} onChange={(event) => mutate((draft) => {
                      draft.guide.steps[index].title = event.target.value;
                    })} />
                    <textarea rows={2} value={item.description} onChange={(event) => mutate((draft) => {
                      draft.guide.steps[index].description = event.target.value;
                    })} />
                  </label>
                ))}
                <TextInput label="Judul Pengingat" value={content.guide.reminderTitle}
                  onChange={(value) => mutate((draft) => { draft.guide.reminderTitle = value; })} />
                <TextInput label="Isi Pengingat" value={content.guide.reminderText} multiline
                  onChange={(value) => mutate((draft) => { draft.guide.reminderText = value; })} />
              </div>
            </section>
          ) : null}

          {activeSection === "faq" ? (
            <section className={`${styles.card} ${styles.animatedCard}`}>
              <div className={styles.cardHeading}><h2>FAQ</h2><p>{tokenHint}</p></div>
              <div className={styles.formGrid}>
                <TextInput label="Judul" value={content.faq.title}
                  onChange={(value) => mutate((draft) => { draft.faq.title = value; })} />
                <TextInput label="Intro" value={content.faq.intro} multiline rows={2}
                  onChange={(value) => mutate((draft) => { draft.faq.intro = value; })} />
                {content.faq.items.map((item, index) => (
                  <label className={styles.fullField} key={item.id}>
                    <span>FAQ {index + 1} · {item.id}</span>
                    <input value={item.question} onChange={(event) => mutate((draft) => {
                      draft.faq.items[index].question = event.target.value;
                    })} />
                    <textarea rows={3} value={item.answer} onChange={(event) => mutate((draft) => {
                      draft.faq.items[index].answer = event.target.value;
                    })} />
                  </label>
                ))}
              </div>
            </section>
          ) : null}

          {activeSection === "contact" ? (
            <section className={`${styles.card} ${styles.animatedCard}`}>
              <div className={styles.cardHeading}><h2>Kontak</h2></div>
              <div className={styles.formGrid}>
                <TextInput label="Judul" value={content.contact.title}
                  onChange={(value) => mutate((draft) => { draft.contact.title = value; })} />
                <TextInput label="Intro" value={content.contact.intro} multiline rows={2}
                  onChange={(value) => mutate((draft) => { draft.contact.intro = value; })} />
              </div>
            </section>
          ) : null}

          <div className={styles.actions}>
            <button type="submit" disabled={saving || loading}>
              {saving ? "Menyimpan..." : "Simpan Konten Publik"}
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
