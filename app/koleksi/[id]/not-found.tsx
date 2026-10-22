import NotFoundState from "@/components/NotFoundState";
import CatalogShell from "@/catalog/CatalogShell";
import styles from "@/catalog/Catalog.module.css";
import stateStyles from "@/components/NotFoundState.module.css";

export default function NotFound() {
  return <CatalogShell><main className={`${styles.main} ${stateStyles.resourceMain}`}><NotFoundState standalone={false} title="Koleksi Tidak Ditemukan"
    description="Koleksi yang Anda cari tidak tersedia. Silakan kembali ke katalog untuk menemukan koleksi lainnya."
    primaryHref="/koleksi" primaryLabel="Kembali ke Koleksi" /></main></CatalogShell>;
}
