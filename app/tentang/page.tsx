import { FiBookOpen, FiShield, FiUsers } from "react-icons/fi";
import CatalogShell from "@/catalog/CatalogShell";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import common from "@/catalog/Catalog.module.css";
import styles from "@/information/Information.module.css";
export const metadata = {
  title: "Tentang Perpustakaan | Perpustakaan Kemenkum Riau",
};
const features = [
  {
    title: "Koleksi Terkurasi",
    description:
      "Koleksi fisik dan e-book yang tertata dengan metadata katalog profesional.",
    icon: FiBookOpen,
  },
  {
    title: "Layanan Anggota",
    description: "Melayani masyarakat umum, mahasiswa, dan pegawai internal.",
    icon: FiUsers,
  },
  {
    title: "Tanpa Denda",
    description:
      "Keterlambatan ditangani melalui pengingat, bukan sanksi uang.",
    icon: FiShield,
  },
];
export default function Page() {
  return (
    <CatalogShell active="tentang">
      <main className={`${common.main} ${styles.main}`}>
        <PageBreadcrumb label="Tentang" />
        <header className={styles.heading}>
          <h1>Tentang Perpustakaan</h1>
          <p>
            Portal digital library institusi pemerintah modern. (Data Contoh)
          </p>
        </header>
        <section className={styles.features} aria-label="Layanan perpustakaan">
          {features.map(({ title, description, icon: Icon }) => (
            <article className={styles.feature} key={title}>
              <span className={styles.icon}>
                <Icon aria-hidden="true" />
              </span>
              <h2>{title}</h2>
              <p>{description}</p>
            </article>
          ))}
        </section>
        <section className={styles.vision}>
          <h2>Visi Layanan</h2>
          <p>
            Menyediakan akses pengetahuan yang mudah, transparan, dan dapat
            diakses oleh seluruh pemustaka. Seluruh konten pada tampilan ini
            merupakan Data Contoh untuk keperluan prototipe dan bukan informasi
            resmi.
          </p>
        </section>
      </main>
    </CatalogShell>
  );
}
