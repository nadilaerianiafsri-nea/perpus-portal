"use client";

import { useState } from "react";
import AdminPublicContentPage from "@/admin/AdminPublicContentPage";
import AdminSettingsPage from "@/admin/AdminSettingsPage";
import styles from "@/admin/AdminSettings.module.css";

type Section = "layanan" | "publik";

export default function Page() {
  const [section, setSection] = useState<Section>("layanan");
  return (
    <div className={styles.settingsShell}>
      <nav className={styles.sectionTabs} aria-label="Bagian pengaturan perpustakaan">
        <button type="button" className={styles.sectionTab} aria-pressed={section === "layanan"}
          onClick={() => setSection("layanan")}>Pengaturan Layanan</button>
        <button type="button" className={styles.sectionTab} aria-pressed={section === "publik"}
          onClick={() => setSection("publik")}>Konten Publik</button>
      </nav>
      {/* Keep forms mounted so switching tabs does not erase unsaved input. */}
      <div className={styles.tabPanel} hidden={section !== "layanan"}>
        <AdminSettingsPage />
      </div>
      <div className={styles.tabPanel} hidden={section !== "publik"}>
        <AdminPublicContentPage />
      </div>
    </div>
  );
}
