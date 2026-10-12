import CatalogShell from "@/catalog/CatalogShell";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import FAQ from "@/information/FAQ";
import { getLibrarySettings } from "@/information/librarySettings";
import { buildFaqItems } from "@/information/serviceContent";
import common from "@/catalog/Catalog.module.css";
import styles from "@/information/Information.module.css";

export const metadata = {
  title: "FAQ | Perpustakaan Kemenkum Riau",
  description:
    "Pertanyaan yang sering diajukan mengenai layanan Perpustakaan Kemenkum Riau.",
};

export default async function Page() {
  const settings = await getLibrarySettings();
  const items = buildFaqItems(settings);

  return (
    <CatalogShell active="faq">
      <main className={`${common.main} ${styles.main} ${styles.helpMain}`}>
        <PageBreadcrumb label="FAQ" />
        <header className={styles.heading}>
          <h1>Pertanyaan yang Sering Diajukan</h1>
          <p>Jawaban ringkas seputar layanan perpustakaan.</p>
        </header>
        <FAQ items={items} />
      </main>
    </CatalogShell>
  );
}
