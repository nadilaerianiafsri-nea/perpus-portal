import Link from 'next/link';
import AuthShell from './AuthShell';
import ResendVerification from './ResendVerification';
import styles from './Auth.module.css';

export default function WaitingVerification({ email, notice }: { email: string; notice?: string }) {
  return <AuthShell registration><div className={styles.formWrap}>
    <header className={styles.heading}><h2>Pendaftaran berhasil</h2><p>Silakan verifikasi email Anda sebelum masuk.</p></header>
    <div className={styles.loginCard}>
      <p className={styles.statusCopy}>Periksa kotak masuk dan folder spam{email ? <> untuk <strong>{email}</strong></> : ''}.</p>
      {notice && <p className={styles.inlineInfo} role="status">{notice}</p>}
      <ResendVerification email={email} />
      <Link className={styles.actionLink} href="/login">Masuk ke Akun</Link>
    </div>
  </div></AuthShell>;
}
