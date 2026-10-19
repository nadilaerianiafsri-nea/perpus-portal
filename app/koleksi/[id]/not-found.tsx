import Link from "next/link";
import CatalogShell from "@/catalog/CatalogShell";
import styles from "@/catalog/Catalog.module.css";
export default function NotFound() {
  return (
    <CatalogShell>
      <main className={styles.main}>
        <div className={styles.state}>
          <h1>Koleksi tidak ditemukan.</h1>
          <Link data-button="ghost" data-button-size="md" href="/koleksi">Kembali ke Koleksi</Link>
        </div>
      </main>
    </CatalogShell>
  );
}
