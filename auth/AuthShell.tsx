import Image from "next/image";
import Link from "next/link";
import styles from "./Auth.module.css";
import enhancements from "./RegisterEnhancements.module.css";

type AuthShellProps = {
  children: React.ReactNode;
  registration?: boolean;
  login?: boolean;
};

export default function AuthShell({
  children,
  registration = false,
  login = false,
}: AuthShellProps) {
  if (login)
    return (
      <main className={`${styles.authPage} ${styles.loginPage}`}>
        <section className={styles.loginSurface} aria-labelledby="login-title">
          {children}
        </section>
      </main>
    );

  if (registration) {
    return (
      <main className={enhancements.registrationShell}>
        <Link href="/" className={enhancements.homeLink}>
          <span aria-hidden="true">←</span>
          <span>Kembali ke Beranda</span>
        </Link>

        <section
          className={`${styles.registrationPage} ${enhancements.registrationSurface}`}
          aria-label="Pendaftaran anggota perpustakaan"
        >
          <Link
            href="/"
            className={enhancements.registrationBrand}
            aria-label="Kembali ke beranda Perpustakaan Kementerian Hukum Riau"
          >
            <span className={enhancements.brandVisual} aria-hidden="true">
              <Image
                src="/images/ASSET%20PERPUS/pengayoman.jpg"
                alt=""
                width={80}
                height={80}
                priority
              />
            </span>
            <span className={enhancements.brandName}>
              Perpustakaan Kementerian Hukum Riau
            </span>
          </Link>

          {children}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.authPage}>
      <aside className={styles.brandPanel}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>P</span>
          <span className={styles.brandCopy}>
            <strong>Perpustakaan</strong>
            <small>[LOGO KEMENKUM RIAU]</small>
          </span>
        </Link>

        <div className={styles.heroCopy}>
          <h1 data-page-title>Satu portal untuk seluruh koleksi.</h1>
        </div>
      </aside>

      <section className={styles.formPanel}>{children}</section>
    </main>
  );
}
