"use client";

import { useEffect, useRef, useState } from "react";
import AdminPublicContentPage from "@/admin/AdminPublicContentPage";
import AdminSettingsPage from "@/admin/AdminSettingsPage";
import styles from "@/admin/AdminSettings.module.css";

type ServiceSection = "identitas" | "reservasi" | "pinjaman";
type ContentSection = "home" | "about" | "guide" | "faq" | "contact";
type Section = ServiceSection | ContentSection;

const sections: { group: string; items: { key: Section; label: string; description: string }[] }[] = [
  {
    group: "Pengaturan Layanan",
    items: [
      { key: "identitas", label: "Informasi Perpustakaan", description: "Nama, alamat, jam buka, dan kontak." },
      { key: "reservasi", label: "Reservasi", description: "Aturan batas waktu reservasi." },
      { key: "pinjaman", label: "Peminjaman", description: "Durasi dan perpanjangan pinjaman." },
    ],
  },
  {
    group: "Konten Publik",
    items: [
      { key: "home", label: "Beranda", description: "Judul dan teks pada halaman utama." },
      { key: "about", label: "Tentang", description: "Pengenalan, fitur, dan visi." },
      { key: "guide", label: "Panduan", description: "Langkah dan informasi peminjaman." },
      { key: "faq", label: "FAQ", description: "Pertanyaan yang sering diajukan." },
      { key: "contact", label: "Kontak", description: "Judul dan pengantar halaman kontak." },
    ],
  },
];

function isService(section: Section): section is ServiceSection {
  return section === "identitas" || section === "reservasi" || section === "pinjaman";
}

export default function Page() {
  const [section, setSection] = useState<Section>("identitas");
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const current = sections.flatMap((group) => group.items).find((item) => item.key === section)!;
  const currentGroup = isService(section) ? "Pengaturan Layanan" : "Konten Publik";

  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !pickerRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        pickerRef.current?.querySelector<HTMLButtonElement>("[aria-haspopup]")?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div className={styles.settingsShell}>
      <header className={styles.workspaceHeader}>
        <div className={styles.workspaceIntro}>
          <h1 data-page-title>Pengaturan Perpustakaan</h1>
          <p>Kelola satu bagian dalam satu waktu. Perubahan disimpan saat menekan tombol Simpan.</p>
        </div>
        <div className={styles.pickerWrap} ref={pickerRef}>
          <span className={styles.pickerLabel}>Bagian yang dikelola</span>
          <button
            type="button"
            className={styles.pickerButton}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls="settings-section-list"
            onClick={() => setOpen((value) => !value)}
          >
            <span className={styles.pickerButtonCopy}>
              <span className={styles.pickerGroupName}>{currentGroup}</span>
              <strong>{current.label}</strong>
            </span>
            <span className={styles.pickerChevron} aria-hidden="true" />
          </button>
          {open ? (
            <div id="settings-section-list" className={styles.pickerMenu} role="listbox" aria-label="Pilih bagian pengaturan">
              {sections.map((group) => (
                <div className={styles.pickerMenuGroup} key={group.group}>
                  <span className={styles.pickerMenuHeading}>{group.group}</span>
                  {group.items.map((item) => (
                    <button
                      type="button"
                      key={item.key}
                      role="option"
                      aria-selected={section === item.key}
                      className={styles.pickerOption}
                      onClick={() => { setSection(item.key); setOpen(false); }}
                    >
                      <span className={styles.pickerOptionTitle}>{item.label}</span>
                      <span className={styles.pickerOptionDescription}>{item.description}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className={styles.currentSection} aria-live="polite">
        <span>{currentGroup}</span>
        <h2>{current.label}</h2>
        <p>{current.description}</p>
      </div>

      <div className={styles.tabPanel} hidden={!isService(section)}>
        <AdminSettingsPage activePanel={isService(section) ? section : "identitas"} />
      </div>
      <div className={styles.tabPanel} hidden={isService(section)}>
        <AdminPublicContentPage activeSection={!isService(section) ? section : "home"} />
      </div>
    </div>
  );
}
