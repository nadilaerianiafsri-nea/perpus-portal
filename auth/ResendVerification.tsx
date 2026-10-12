"use client";
import { useRef, useState } from 'react';
import { authRequest } from './authApi';
import styles from './Auth.module.css';
import { plaintextError } from '@/catalog/plaintextInput.cjs';

export default function ResendVerification({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const locked = useRef(false);
  async function resend() {
    if (locked.current) return;
    const error = plaintextError(email, { required: true }); if (error) { setMessage(error); return; }
    locked.current = true; setLoading(true); setMessage('');
    const result = await authRequest('resend-verification', { email });
    setMessage(result.message); setLoading(false); locked.current = false;
  }
  return <>
    <button type="button" className={styles.primaryButton} disabled={loading || !email} onClick={resend}>{loading ? 'Mengirim...' : 'Kirim Ulang Email Verifikasi'}</button>
    {message && <p className={styles.inlineInfo} role="status">{message}</p>}
  </>;
}
