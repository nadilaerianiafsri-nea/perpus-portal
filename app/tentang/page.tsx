import { FiBookOpen, FiShield, FiUsers } from "react-icons/fi";
import CatalogShell from "@/catalog/CatalogShell";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import { getPublicContent } from "@/information/publicContent";
import common from "@/catalog/Catalog.module.css";
import styles from "@/information/Information.module.css";

export const metadata = {
  title: "Tentang Perpustakaan | Perpustakaan Kemenkum Riau",
};

const icons = [FiBookOpen, FiUsers, FiShield];

export default async function Page() {
  const content = await getPublicContent();

  return (
    <CatalogShell active="tentang">
      <main className={`${common.main} ${styles.main} public-info-refresh`}>
        <PageBreadcrumb label="Tentang" />
        <header className={styles.heading}>
          <h1>{content.about.title}</h1>
          <p>{content.about.intro}</p>
        </header>
        <section className={styles.features} aria-label="Layanan perpustakaan">
          {content.about.features.map(({ title, description }, index) => {
            const Icon = icons[index % icons.length];
            return (
              <article className={styles.feature} key={`${title}-${index}`}>
                <span className={styles.icon}>
                  <Icon aria-hidden="true" />
                </span>
                <h2>{title}</h2>
                <p>{description}</p>
              </article>
            );
          })}
        </section>
        <section className={styles.vision}>
          <h2>{content.about.visionTitle}</h2>
          <p>{content.about.visionText}</p>
        </section>
      </main>
    </CatalogShell>
  );
}
