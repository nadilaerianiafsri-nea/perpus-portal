import { Suspense } from "react";
import { FiGift } from "react-icons/fi";
import CatalogShell from "@/catalog/CatalogShell";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import Grants from "@/information/Grants";
import common from "@/catalog/Catalog.module.css";
import styles from "@/information/Information.module.css";
export const metadata = {
  title: "Informasi Hibah Buku | Perpustakaan Kemenkum Riau",
};
export default function Page() {
  return (
    <CatalogShell active="hibah">
      <main className={`${common.main} ${styles.main} ${styles.grantMain}`}>
        <PageBreadcrumb label="Hibah Buku" />
        <header className={`${styles.heading} ${styles.grantHeading}`}>
          <span className={styles.heroIcon}>
            <FiGift aria-hidden="true" />
          </span>
          <div>
            <h1>Informasi Hibah Buku</h1>
            <p>
              Daftar koleksi hibah yang telah diterima perpustakaan. Halaman ini
              bersifat informatif.
            </p>
          </div>
        </header>
        <Suspense fallback={<p role="status">Memuat informasi hibah...</p>}>
          <Grants />
        </Suspense>
      </main>
    </CatalogShell>
  );
}
