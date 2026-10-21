import CatalogShell from "@/catalog/CatalogShell";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import FAQ from "@/information/FAQ";
import { getLibrarySettings } from "@/information/librarySettings";
import {
  getPublicContent,
  renderPublicText,
} from "@/information/publicContent";
import common from "@/catalog/Catalog.module.css";
import styles from "@/information/Information.module.css";

export const metadata = {
  title: "FAQ | Perpustakaan Kemenkum Riau",
  description:
    "Pertanyaan yang sering diajukan mengenai layanan Perpustakaan Kemenkum Riau.",
};

export default async function Page() {
  const [settings, content] = await Promise.all([
    getLibrarySettings(),
    getPublicContent(),
  ]);
  const faqItems = content.faq.items.map((item) => ({
    id: item.id,
    question: renderPublicText(item.question, settings),
    answer: renderPublicText(item.answer, settings),
  }));

  return (
    <CatalogShell active="faq">
      <main className={`${common.main} ${styles.main} ${styles.helpMain} public-info-refresh`}>
        <PageBreadcrumb label="FAQ" />

        <header className={styles.heading}>
          <h1 data-page-title>{content.faq.title}</h1>
        </header>

        <FAQ items={faqItems} />
      </main>
    </CatalogShell>
  );
}
