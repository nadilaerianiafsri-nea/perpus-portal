import Link from "next/link";
import styles from "./Auth.module.css";

type AuthShellProps = {
  children: React.ReactNode;
  registration?: boolean;
};

export default function AuthShell({ children, registration = false }: AuthShellProps) {
  return (
    <main className={`${styles.authPage} ${registration ? styles.registrationPage : ""}`}>
      <aside className={styles.brandPanel}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandMark}>P</span>
          <span className={styles.brandCopy}>
            <strong>Perpustakaan</strong>
            <small>[LOGO KEMENKUM RIAU]</small>
          </span>
        </Link>

        <div className={styles.heroCopy}>
          <h1>Satu portal untuk seluruh koleksi.</h1>
          <p>
            Kelola reservasi, pinjaman, e-book, dan pengingat layanan dalam
            satu dashboard yang bersih dan modern.
          </p>
        </div>

        <small className={styles.prototype}>
          Data Contoh — prototype antarmuka.
        </small>
      </aside>

      <section className={styles.formPanel}>{children}</section>
    </main>
  );
}
