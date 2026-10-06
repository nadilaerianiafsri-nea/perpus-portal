import Link from "next/link";
import styles from "@/catalog/Catalog.module.css";
export default function PageBreadcrumb({ label }: { label: string }) {
  return (
    <nav className={styles.breadcrumb} aria-label="Jejak navigasi">
      <Link href="/">Beranda</Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page">{label}</span>
    </nav>
  );
}
