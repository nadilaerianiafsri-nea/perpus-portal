import { Suspense } from "react";
import Catalog from "@/catalog/Catalog";
import CatalogShell from "@/catalog/CatalogShell";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import styles from "./KoleksiHeader.module.css";

export const metadata = {
  title: "Katalog Koleksi | Perpustakaan Kemenkum Riau",
};

export default function Page() {
  return (
    <CatalogShell active="koleksi">
      <section
        className={styles.headerArea}
        aria-label="Judul halaman koleksi"
      >
        <PageBreadcrumb label="Koleksi" />

        <header className={styles.pageHeader}>
          <h1 data-page-title>Katalog Koleksi</h1>
        </header>
      </section>

      <div className={styles.catalogHost}>
        <Suspense fallback={<p role="status">Memuat katalog...</p>}>
          <Catalog />
        </Suspense>
      </div>
    </CatalogShell>
  );
}
