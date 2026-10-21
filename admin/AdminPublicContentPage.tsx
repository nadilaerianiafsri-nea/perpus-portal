"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { PublicContent } from "@/information/publicContentTypes";
import styles from "./AdminSettings.module.css";

const homeFields: Array<{
  key: keyof PublicContent["home"];
  label: string;
  multiline?: boolean;
}> = [
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

export default function AdminPublicContentPage() {
  const [content, setContent] = useState<PublicContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/members/admin/public-content", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Konten publik belum dapat dimuat.");
      setContent((await response.json()) as PublicContent);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Konten publik belum dapat dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function mutate(updater: (draft: PublicContent) => void) {
    setContent((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      updater(next);
      return next;
    });
    setSuccess("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content || saving) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/members/admin/public-content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });
      const body = (await response.json()) as PublicContent & { message?: string };
      if (!response.ok) {
        throw new Error(body.message || "Konten publik gagal disimpan.");
      }
      setContent(body);
      setSuccess("Konten publik berhasil disimpan dan langsung digunakan pada landing page.");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Konten publik gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <div>
          <h1 data-page-title>Konten Publik</h1>
        </div>
      </header>

      {error ? (
        <div className={styles.errorBox} role="alert">
          <span>{error}</span>
          {!content ? (
            <button type="button" onClick={() => void load()}>
              Coba Lagi
            </button>
          ) : null}
        </div>
      ) : null}
      {success ? <div className={styles.successBox}>{success}</div> : null}
      {loading && !content ? (
        <div className={styles.loadingBox}>Memuat konten publik...</div>
      ) : null}

      {content ? (
        <form className={styles.form} onSubmit={save}>
          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <h2>Beranda</h2>
              <p>Gambar hero, warna, icon, dan layout utama tetap dikelola oleh design system.</p>
            </div>
            <div className={styles.formGrid}>
              {homeFields.map(({ key, label, multiline }) => (
                <label className={multiline ? styles.fullField : undefined} key={key}>
                  <span>{label}</span>
                  {multiline ? (
                    <textarea
                      rows={3}
                      value={content.home[key]}
                      onChange={(event) =>
                        mutate((draft) => {
                          draft.home[key] = event.target.value;
                        })
                      }
                    />
                  ) : (
                    <input
                      value={content.home[key]}
                      onChange={(event) =>
                        mutate((draft) => {
                          draft.home[key] = event.target.value;
                        })
                      }
                    />
                  )}
                </label>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <h2>Tentang</h2>
            </div>
            <div className={styles.formGrid}>
              <label>
                <span>Judul</span>
                <input
                  value={content.about.title}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.about.title = event.target.value;
                    })
                  }
                />
              </label>
              <label className={styles.fullField}>
                <span>Intro</span>
                <textarea
                  rows={3}
                  value={content.about.intro}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.about.intro = event.target.value;
                    })
                  }
                />
              </label>
              {content.about.features.map((feature, index) => (
                <label className={styles.fullField} key={`about-${index}`}>
                  <span>Fitur {index + 1}</span>
                  <input
                    value={feature.title}
                    onChange={(event) =>
                      mutate((draft) => {
                        draft.about.features[index].title = event.target.value;
                      })
                    }
                  />
                  <textarea
                    rows={2}
                    value={feature.description}
                    onChange={(event) =>
                      mutate((draft) => {
                        draft.about.features[index].description = event.target.value;
                      })
                    }
                  />
                </label>
              ))}
              <label>
                <span>Judul Visi</span>
                <input
                  value={content.about.visionTitle}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.about.visionTitle = event.target.value;
                    })
                  }
                />
              </label>
              <label className={styles.fullField}>
                <span>Isi Visi</span>
                <textarea
                  rows={3}
                  value={content.about.visionText}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.about.visionText = event.target.value;
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <h2>Panduan</h2>
              <p>{tokenHint}</p>
            </div>
            <div className={styles.formGrid}>
              <label>
                <span>Judul</span>
                <input
                  value={content.guide.title}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.guide.title = event.target.value;
                    })
                  }
                />
              </label>
              <label className={styles.fullField}>
                <span>Intro</span>
                <textarea
                  rows={2}
                  value={content.guide.intro}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.guide.intro = event.target.value;
                    })
                  }
                />
              </label>
              {content.guide.steps.map((step, index) => (
                <label className={styles.fullField} key={`guide-${index}`}>
                  <span>Langkah {index + 1}</span>
                  <input
                    value={step.title}
                    onChange={(event) =>
                      mutate((draft) => {
                        draft.guide.steps[index].title = event.target.value;
                      })
                    }
                  />
                  <textarea
                    rows={2}
                    value={step.description}
                    onChange={(event) =>
                      mutate((draft) => {
                        draft.guide.steps[index].description = event.target.value;
                      })
                    }
                  />
                </label>
              ))}
              <label>
                <span>Judul Pengingat</span>
                <input
                  value={content.guide.reminderTitle}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.guide.reminderTitle = event.target.value;
                    })
                  }
                />
              </label>
              <label className={styles.fullField}>
                <span>Isi Pengingat</span>
                <textarea
                  rows={3}
                  value={content.guide.reminderText}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.guide.reminderText = event.target.value;
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <h2>FAQ</h2>
              <p>{tokenHint}</p>
            </div>
            <div className={styles.formGrid}>
              <label>
                <span>Judul</span>
                <input
                  value={content.faq.title}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.faq.title = event.target.value;
                    })
                  }
                />
              </label>
              <label className={styles.fullField}>
                <span>Intro</span>
                <textarea
                  rows={2}
                  value={content.faq.intro}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.faq.intro = event.target.value;
                    })
                  }
                />
              </label>
              {content.faq.items.map((item, index) => (
                <label className={styles.fullField} key={item.id}>
                  <span>FAQ {index + 1} · {item.id}</span>
                  <input
                    value={item.question}
                    onChange={(event) =>
                      mutate((draft) => {
                        draft.faq.items[index].question = event.target.value;
                      })
                    }
                  />
                  <textarea
                    rows={3}
                    value={item.answer}
                    onChange={(event) =>
                      mutate((draft) => {
                        draft.faq.items[index].answer = event.target.value;
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </section>

          <section className={styles.card}>
            <div className={styles.cardHeading}>
              <h2>Kontak</h2>
            </div>
            <div className={styles.formGrid}>
              <label>
                <span>Judul</span>
                <input
                  value={content.contact.title}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.contact.title = event.target.value;
                    })
                  }
                />
              </label>
              <label className={styles.fullField}>
                <span>Intro</span>
                <textarea
                  rows={2}
                  value={content.contact.intro}
                  onChange={(event) =>
                    mutate((draft) => {
                      draft.contact.intro = event.target.value;
                    })
                  }
                />
              </label>
            </div>
          </section>

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
