"use client";
import { useState } from 'react';
import Link from 'next/link';
import AuthShell from './AuthShell';
import ResendVerification from './ResendVerification';
import styles from './Auth.module.css';
export default function CheckEmail({ initialEmail }: { initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  return <AuthShell registration><div className={styles.formWrap}><header className={styles.heading}><h2>Verifikasi Email</h2><p>Silakan verifikasi email Anda sebelum masuk.</p></header>
    <div className={styles.loginCard}><label className={styles.field}><span>Email <b>*</b></span><input type="email" autoComplete="email" maxLength={191} value={email} onChange={(e) => setEmail(e.target.value)} /></label><ResendVerification email={email} /><Link className={styles.actionLink} href="/login">Masuk ke Akun</Link></div>
  </div></AuthShell>;
}
