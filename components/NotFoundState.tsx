import Image from "next/image";
import Link from "next/link";
import { FiHome } from "react-icons/fi";
import { ButtonLink } from "./Button";
import NotFoundBackButton from "./NotFoundBackButton";
import styles from "./NotFoundState.module.css";

type Props = {
  context?: "public" | "admin" | "member";
  title?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
};

const destinations = {
  public: { href: "/", label: "Kembali ke Beranda" },
  admin: { href: "/admin", label: "Kembali ke Dashboard" },
  member: { href: "/dashboard", label: "Kembali ke Ringkasan" },
};

export default function NotFoundState({
  context = "public",
  title = "Halaman Tidak Ditemukan",
  description = "Halaman yang Anda cari tidak tersedia, telah dipindahkan, atau alamat yang digunakan tidak tepat.",
  primaryHref = destinations[context].href,
  primaryLabel = destinations[context].label,
}: Props) {
  const standalone = context === "public";
  const Container = standalone ? "main" : "section";
  return <Container className={`${styles.page} ${standalone ? styles.standalone : styles.contextual}`} aria-labelledby="not-found-title" data-not-found={context}>
    {standalone ? <Link href="/" className={styles.brand} aria-label="Perpustakaan Kemenkum Riau — Beranda">
      <span className={styles.brandMark} aria-hidden="true">P</span>
      <span><strong>Perpustakaan</strong><small>KEMENKUM RIAU</small></span>
    </Link> : null}
    <div className={styles.content}>
      <div className={styles.copy}>
        <p className={styles.code} aria-hidden="true">404</p>
        <h1 id="not-found-title" data-page-title>{title}</h1>
        <p className={styles.description}>{description}</p>
        <div className={styles.actions}>
          <ButtonLink href={primaryHref} variant="primary" accentHover icon={<FiHome />}>{primaryLabel}</ButtonLink>
          <NotFoundBackButton fallbackHref={primaryHref} />
        </div>
      </div>
      <div className={styles.visual}>
        <Image src="/images/ASSET PERPUS/asset buku kaca pembesar.png" width={1254} height={1254}
          sizes="(max-width: 600px) 200px, (max-width: 1100px) 260px, 340px"
          alt="Buku terbuka dengan kaca pembesar bermotif Riau" />
      </div>
    </div>
  </Container>;
}
