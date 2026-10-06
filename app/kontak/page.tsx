import CatalogShell from "@/catalog/CatalogShell";
import PageBreadcrumb from "@/components/PageBreadcrumb";
import ServiceDetails from "@/components/ServiceDetails";
import ContactForm from "@/information/ContactForm";
import { serviceInfo } from "@/shared/serviceInfo.cjs";
import common from "@/catalog/Catalog.module.css";
import info from "@/information/Information.module.css";
import styles from "@/information/Contact.module.css";

export const metadata = {
  title: "Kontak | Perpustakaan Kemenkum Riau",
  description: "Informasi layanan dan formulir kontak Perpustakaan Kemenkum Riau.",
};
export default function Page() {
  return (
    <CatalogShell active="kontak">
      <main className={`${common.main} ${info.main} ${info.helpMain}`}>
        <PageBreadcrumb label="Kontak" />
        <header className={info.heading}>
          <h1>Hubungi Kami</h1>
          <p>Informasi layanan dan formulir pesan.</p>
        </header>
        <div className={styles.grid}>
          <section className={styles.card} aria-labelledby="service-heading">
            <h2 id="service-heading">Informasi Layanan</h2>
            <div className={styles.details}><ServiceDetails /></div>
            <figure className={styles.map}>
              <iframe src={serviceInfo.mapEmbedUrl} title="Peta lokasi Perpustakaan Kemenkum Riau" loading="lazy" referrerPolicy="no-referrer" />
              <figcaption>
                <a href={serviceInfo.openStreetMapUrl} target="_blank" rel="noopener noreferrer">Buka di OpenStreetMap</a>
                <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© OpenStreetMap contributors</a>
              </figcaption>
            </figure>
          </section>
          <section className={styles.card} aria-labelledby="message-heading">
            <h2 id="message-heading">Kirim Pesan</h2>
            <ContactForm />
          </section>
        </div>
      </main>
    </CatalogShell>
  );
}
