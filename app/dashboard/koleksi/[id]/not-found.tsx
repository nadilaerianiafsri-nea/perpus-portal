import Link from "next/link";
import styles from "@/catalog/BookDetail.module.css";

export default function NotFound() {
  return (
    <section className={`${styles.page} ${styles.memberPage} ${styles.error}`}>
      <h1>Koleksi tidak ditemukan.</h1>
      <p>Koleksi mungkin sudah tidak tersedia.</p>
      <Link className={styles.primaryLink} href="/dashboard/koleksi">
        Kembali ke Katalog
      </Link>
    </section>
  );
}
