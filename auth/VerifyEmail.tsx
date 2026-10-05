"use client";
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import AuthShell from './AuthShell';
import { authRequest, type AuthResult } from './authApi';
import styles from './Auth.module.css';

export default function VerifyEmail({ token }: { token: string }) {
  const [result, setResult] = useState<AuthResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const pending = useRef<{ token: string; attempt: number; promise: Promise<AuthResult> } | null>(null);
  useEffect(() => {
    let active = true;
    if (!token) return;
    if (!pending.current || pending.current.token !== token || pending.current.attempt !== attempt) pending.current = { token, attempt, promise: authRequest(`verify-email?token=${encodeURIComponent(token)}`) };
    pending.current.promise.then((value) => { if (active) setResult(value); });
    return () => { active = false; };
  }, [token, attempt]);
  const message = !token ? 'Token verifikasi tidak valid.' : !result ? 'Sedang memverifikasi email...' : result.ok ? result.alreadyVerified ? 'Email sudah pernah diverifikasi.' : 'Email berhasil diverifikasi.' : result.code === 'TOKEN_EXPIRED' ? 'Token verifikasi sudah kedaluwarsa. Silakan minta email verifikasi baru.' : result.message;
  return <AuthShell registration><div className={styles.formWrap}>
    <header className={styles.heading}><h2>Verifikasi Email</h2></header>
    <div className={styles.loginCard} aria-busy={!!token && !result}>
      <p className={styles.statusCopy} role="status">{message}</p>
      {result && !result.ok && <button className={styles.linkButton} onClick={() => { setResult(null); setAttempt((n) => n + 1); }}>Coba lagi</button>}
      <Link className={styles.actionLink} href="/login">Masuk ke Akun</Link>
      {(!token || (result && !result.ok)) && <Link className={styles.actionLink} href="/check-email">Kirim ulang email verifikasi</Link>}
    </div>
  </div></AuthShell>;
}
