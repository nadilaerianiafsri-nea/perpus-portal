import { FiInfo } from "react-icons/fi";
import CatalogShell from "@/catalog/CatalogShell";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getLibrarySettings } from "@/information/librarySettings";
import { buildGuideSteps } from "@/information/serviceContent";
import common from "@/catalog/Catalog.module.css";
import styles from "@/information/Information.module.css";

export const metadata = {
  title: "Panduan Peminjaman | Perpustakaan Kemenkum Riau",
  description:
    "Panduan layanan pendaftaran, reservasi, peminjaman, dan pengembalian buku.",
};

export default async function Page() {
  const settings = await getLibrarySettings();
  const guideSteps = buildGuideSteps(settings);

  return (
    <CatalogShell active="panduan">
      <main className={`${common.main} ${styles.main} ${styles.helpMain}`}>
        <PageBreadcrumb label="Panduan" />
        <header className={styles.heading}>
          <h1 data-page-title>Panduan Peminjaman</h1>
        </header>
        <section className={styles.steps} aria-label="Langkah peminjaman buku">
          {guideSteps.map(({ title, description }) => (
            <article className={styles.step} key={title}>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </section>
        <aside className={`${styles.alert} ${styles.reminder}`}>
          <FiInfo aria-hidden="true" />
          <div>
            <h2>Pengingat layanan</h2>
            <p>
              Email pengingat jatuh tempo dikirim otomatis pada H-1, hari jatuh
              tempo, lalu H+2 dan seterusnya selama masih terlambat. WhatsApp
              ditindaklanjuti manual oleh petugas.
            </p>
          </div>
        </aside>
      </main>
    </CatalogShell>
  );
}
