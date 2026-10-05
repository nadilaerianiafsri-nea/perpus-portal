"use client";
import { useRef, useState } from 'react';
import { authRequest } from './authApi';
import styles from './Auth.module.css';

export default function ResendVerification({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const locked = useRef(false);
  async function resend() {
    if (locked.current) return;
    locked.current = true; setLoading(true); setMessage('');
    const result = await authRequest('resend-verification', { email });
    setMessage(result.message); setLoading(false); locked.current = false;
  }
  return <>
    <button type="button" className={styles.primaryButton} disabled={loading || !email} onClick={resend}>{loading ? 'Mengirim...' : 'Kirim Ulang Email Verifikasi'}</button>
    {message && <p className={styles.inlineInfo} role="status">{message}</p>}
  </>;
}
