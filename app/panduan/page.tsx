import { FiInfo } from "react-icons/fi";
import CatalogShell from "@/catalog/CatalogShell";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { guideSteps } from "@/information/serviceContent";
import common from "@/catalog/Catalog.module.css";
import styles from "@/information/Information.module.css";

export const metadata = {
  title: "Panduan Peminjaman | Perpustakaan Kemenkum Riau",
  description:
    "Panduan layanan pendaftaran, reservasi, peminjaman, dan pengembalian buku.",
};

export default function Page() {
  return (
    <CatalogShell active="panduan">
      <main className={`${common.main} ${styles.main} ${styles.helpMain}`}>
        <PageBreadcrumb label="Panduan" />
        <header className={styles.heading}>
          <h1>Panduan Peminjaman</h1>
          <p>Alur layanan dari pendaftaran hingga pengembalian.</p>
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
              Pengingat jatuh tempo dikirim otomatis melalui Email dan WhatsApp
              pada H-1, hari jatuh tempo, H+1, lalu setiap 2 hari selama terlambat.
            </p>
          </div>
        </aside>
      </main>
    </CatalogShell>
  );
}
