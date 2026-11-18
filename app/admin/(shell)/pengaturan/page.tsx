"use client";

import { useEffect, useRef, useState } from "react";
import AdminPublicContentPage from "@/admin/AdminPublicContentPage";
import AdminSettingsPage from "@/admin/AdminSettingsPage";
import Link from "next/link";
import styles from "@/admin/AdminSettings.module.css";

type ServiceSection = "identitas" | "sirkulasi";
type ContentSection = "home" | "about" | "guide" | "faq" | "contact";
type Section = ServiceSection | ContentSection;
type PickerSection = Section | "subjects";

const sections: { group: string; items: { key: PickerSection; label: string }[] }[] = [
  {
    group: "Pengaturan Layanan",
    items: [
      { key: "identitas", label: "Informasi Perpustakaan" },
      { key: "sirkulasi", label: "Sirkulasi" },
      { key: "subjects", label: "Subjek / Kategori" },
    ],
  },
  {
    group: "Konten Publik",
    items: [
      { key: "home", label: "Beranda" },
      { key: "about", label: "Tentang" },
      { key: "guide", label: "Panduan" },
      { key: "faq", label: "FAQ" },
      { key: "contact", label: "Kontak" },
    ],
  },
];

function isService(section: Section): section is ServiceSection {
  return section === "identitas" || section === "sirkulasi";
}

function isContent(section: Section): section is ContentSection {
  return section === "home" || section === "about" || section === "guide" || section === "faq" || section === "contact";
}

export default function Page() {
  const [section, setSection] = useState<Section>("identitas");
  const [open, setOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const current = sections.flatMap((group) => group.items).find((item) => item.key === section)!;

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
        <h1 className={styles.workspaceHiddenTitle} data-page-title>
          Pengaturan Perpustakaan
        </h1>
        <div className={styles.pickerWrap} ref={pickerRef}>
          <button
            type="button"
            className={styles.pickerButton}
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-controls="settings-section-list"
            onClick={() => setOpen((value) => !value)}
          >
            <span className={styles.pickerButtonCopy}>
              <strong>{current.label}</strong>
            </span>
            <span className={styles.pickerChevron} aria-hidden="true" />
          </button>
          {open ? (
            <div
              id="settings-section-list"
              className={styles.pickerMenu}
              role="listbox"
              aria-label="Pilih bagian pengaturan"
            >
              {sections.map((group) => (
                <div className={styles.pickerMenuGroup} key={group.group}>
                  <span className={styles.pickerMenuHeading}>{group.group}</span>
                  {group.items.map((item) => item.key === "subjects" ? (
                    <Link
                      href="/admin/pengaturan/subjek-kategori"
                      key={item.key}
                      role="option"
                      aria-selected={false}
                      className={[styles.pickerOption, styles.pickerOptionLink].join(" ")}
                      onClick={() => setOpen(false)}
                    >
                      <span className={styles.pickerOptionTitle}>{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      key={item.key}
                      role="option"
                      aria-selected={section === item.key}
                      className={styles.pickerOption}
                      onClick={() => { setSection(item.key as Section); setOpen(false); }}
                    >
                      <span className={styles.pickerOptionTitle}>{item.label}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </header>

      <div className={styles.tabPanel} hidden={!isService(section)}>
        <AdminSettingsPage activePanel={isService(section) ? section : "identitas"} />
      </div>
      <div className={styles.tabPanel} hidden={!isContent(section)}>
        <AdminPublicContentPage activeSection={isContent(section) ? section : "home"} />
      </div>
    </div>
  );
}
