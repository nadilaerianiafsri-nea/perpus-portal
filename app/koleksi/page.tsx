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
    <CatalogShell>
      <div
        className={styles.headerArea}
        data-collection-page-header
      >
        <PageBreadcrumb label="Koleksi" />

        <header className={styles.headerCard}>
          <h1 data-page-title>Katalog Koleksi</h1>
        </header>
      </div>

      <Suspense fallback={<p role="status">Memuat katalog...</p>}>
        <Catalog />
      </Suspense>
    </CatalogShell>
  );
}
