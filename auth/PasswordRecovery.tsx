"use client";
import { type FormEvent, useRef, useState } from 'react';
import { ButtonLabel } from '@/components/Button';
import Link from 'next/link';
import AuthShell from './AuthShell';
import { authRequest } from './authApi';
import styles from './Auth.module.css';
import { plaintextError } from '@/catalog/plaintextInput.cjs';

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
    if (!reset) { const error = plaintextError(email, { required: true }); if (error) { setMessage(error); return; } }
    if (reset && (password.length < 8 || password !== confirmation)) { setMessage('Kata sandi minimal 8 karakter dan konfirmasi harus sama.'); return; }
    if (reset && new TextEncoder().encode(password).length > 72) { setMessage('Kata sandi maksimal 72 byte.'); return; }
    locked.current = true; setLoading(true); setMessage('');
    const result = await authRequest(reset ? 'reset-password' : 'forgot-password', reset ? { token, password } : { email });
    setMessage(result.ok && reset ? 'Password berhasil diperbarui.' : result.message); setDone(result.ok && reset); setLoading(false); locked.current = false;
    if (result.ok && reset) { setPassword(''); setConfirmation(''); }
  }
  return <AuthShell registration><div className={styles.formWrap}>
    <header className={styles.heading}><h2 data-page-title>{reset ? 'Reset Kata Sandi' : 'Lupa Kata Sandi'}</h2></header>
    <form className={styles.loginCard} onSubmit={submit} aria-busy={loading}>
      <p className={styles.statusCopy}>{reset ? 'Buat kata sandi baru untuk akun Anda.' : 'Masukkan email akun Anda untuk menerima link reset.'}</p>
      {reset ? <>
        {!token && <p role="alert">Token reset tidak valid. Minta link reset baru.</p>}
        {!done && <><label className={styles.field}><span>Kata Sandi Baru <b>*</b></span><input type="password" autoComplete="new-password" minLength={8} required value={password} disabled={loading || !token} onChange={(e) => setPassword(e.target.value)} /></label>
          <label className={styles.field}><span>Konfirmasi Kata Sandi <b>*</b></span><input type="password" autoComplete="new-password" minLength={8} required value={confirmation} disabled={loading || !token} onChange={(e) => setConfirmation(e.target.value)} /></label></>}
      </> : <label className={styles.field}><span>Email <b>*</b></span><input type="email" autoComplete="email" maxLength={191} required value={email} disabled={loading} onChange={(e) => setEmail(e.target.value)} /></label>}
      {!done && <button aria-busy={loading} data-button="primary" data-button-size="lg" className={styles.primaryButton} disabled={loading || (reset && !token)}><ButtonLabel loading={loading} pending={reset ? 'Menyimpan...' : 'Mengirim...'}>{reset ? 'Simpan Kata Sandi' : 'Kirim Link Reset'}</ButtonLabel></button>}
      {message && <p className={styles.inlineInfo} role="status">{message}</p>}
      <Link data-button="secondary" data-button-size="md" className={styles.actionLink} href="/login">{done ? 'Masuk' : 'Masuk ke Akun'}</Link>
      {reset && !done && <Link data-button="secondary" data-button-size="md" className={styles.actionLink} href="/forgot-password">Minta link reset baru</Link>}
    </form>
  </div></AuthShell>;
}
