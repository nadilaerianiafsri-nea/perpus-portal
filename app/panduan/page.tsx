import { FiInfo } from "react-icons/fi";
import CatalogShell from "@/catalog/CatalogShell";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getLibrarySettings } from "@/information/librarySettings";
import {
  getPublicContent,
  renderPublicText,
} from "@/information/publicContent";
import common from "@/catalog/Catalog.module.css";
import styles from "@/information/Information.module.css";

export const metadata = {
  title: "Panduan Peminjaman | Perpustakaan Kemenkum Riau",
  description:
    "Panduan layanan pendaftaran, reservasi, peminjaman, dan pengembalian buku.",
};

export default async function Page() {
  const [settings, content] = await Promise.all([
    getLibrarySettings(),
    getPublicContent(),
  ]);

  return (
    <CatalogShell active="panduan">
      <main className={`${common.main} ${styles.main} ${styles.helpMain} public-info-refresh`}>
        <PageBreadcrumb label="Panduan" />

        <header className={styles.heading}>
          <h1 data-page-title>{content.guide.title}</h1>
        </header>

        <section className={styles.steps} aria-label="Langkah peminjaman buku">
          {content.guide.steps.map(({ title, description }, index) => (
            <article className={styles.step} key={`${title}-${index}`}>
              <h2>{renderPublicText(title, settings)}</h2>
              <p>{renderPublicText(description, settings)}</p>
            </article>
          ))}
        </section>

        <aside className={`${styles.alert} ${styles.reminder}`}>
          <FiInfo aria-hidden="true" />
          <div>
            <h2>{content.guide.reminderTitle}</h2>
            <p>{renderPublicText(content.guide.reminderText, settings)}</p>
          </div>
        </aside>
      </main>
    </CatalogShell>
  );
}
