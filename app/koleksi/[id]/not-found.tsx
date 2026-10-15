import Link from "next/link";
import CatalogShell from "@/catalog/CatalogShell";
import styles from "@/catalog/Catalog.module.css";
export default function NotFound() {
  return (
    <CatalogShell>
      <main className={styles.main}>
        <div className={styles.state}>
          <h1>Buku atau E-Book tidak ditemukan.</h1>
          <Link href="/koleksi">Kembali ke Katalog</Link>
          <Link href="/e-book">Kembali ke E-Book</Link>
        </div>
      </main>
    </CatalogShell>
  );
}
