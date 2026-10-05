"use client";
import { type FormEvent, useRef, useState } from 'react';
import Link from 'next/link';
import AuthShell from './AuthShell';
import { authRequest } from './authApi';
import styles from './Auth.module.css';

export default function PasswordRecovery({ token, reset = false }: { token?: string; reset?: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const locked = useRef(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (locked.current) return;
    if (reset && (password.length < 8 || password !== confirmation)) { setMessage('Kata sandi minimal 8 karakter dan konfirmasi harus sama.'); return; }
    locked.current = true; setLoading(true); setMessage('');
    const result = await authRequest(reset ? 'reset-password' : 'forgot-password', reset ? { token, password } : { email });
    setMessage(result.message); setDone(result.ok && reset); setLoading(false); locked.current = false;
    if (result.ok && reset) { setPassword(''); setConfirmation(''); }
  }
  return <AuthShell registration><div className={styles.formWrap}>
    <header className={styles.heading}><h2>{reset ? 'Reset Kata Sandi' : 'Lupa Kata Sandi'}</h2><p>{reset ? 'Buat kata sandi baru untuk akun Anda.' : 'Masukkan email akun Anda untuk menerima link reset.'}</p></header>
    <form className={styles.loginCard} onSubmit={submit} aria-busy={loading}>
      {reset ? <>
        {!token && <p role="alert">Token reset tidak valid. Minta link reset baru.</p>}
        {!done && <><label className={styles.field}><span>Kata Sandi Baru <b>*</b></span><input type="password" autoComplete="new-password" minLength={8} required value={password} disabled={loading || !token} onChange={(e) => setPassword(e.target.value)} /></label>
          <label className={styles.field}><span>Konfirmasi Kata Sandi <b>*</b></span><input type="password" autoComplete="new-password" minLength={8} required value={confirmation} disabled={loading || !token} onChange={(e) => setConfirmation(e.target.value)} /></label></>}
      </> : <label className={styles.field}><span>Email <b>*</b></span><input type="email" autoComplete="email" maxLength={191} required value={email} disabled={loading} onChange={(e) => setEmail(e.target.value)} /></label>}
      {!done && <button className={styles.primaryButton} disabled={loading || (reset && !token)}>{loading ? 'Memproses...' : reset ? 'Simpan Kata Sandi' : 'Kirim Link Reset'}</button>}
      {message && <p className={styles.inlineInfo} role="status">{message}</p>}
      <Link className={styles.actionLink} href="/login">Masuk ke Akun</Link>
      {reset && !done && <Link className={styles.actionLink} href="/forgot-password">Minta link reset baru</Link>}
    </form>
  </div></AuthShell>;
}
