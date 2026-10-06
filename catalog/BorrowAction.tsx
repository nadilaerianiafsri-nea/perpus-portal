"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import styles from "./Catalog.module.css";
export default function BorrowAction({ available, bookId, role }: {
  available: boolean; bookId: number; role: "ADMIN" | "PENGUNJUNG" | null;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  async function reserve() {
    if (locked.current) return;
    locked.current = true; setPending(true); setError("");
    try {
      const response = await fetch("/api/members/me/reservations", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }), signal: AbortSignal.timeout(16000),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/koleksi/${bookId}`)}`); return;
      }
      if (!response.ok) { setError(typeof data.message === "string" ? data.message : "Reservasi belum berhasil. Silakan coba lagi."); return; }
      dialog.current?.close(); setSuccess(true); router.refresh();
    } catch { setError("Layanan reservasi belum dapat dihubungi. Silakan coba lagi."); }
    finally { setPending(false); locked.current = false; }
  }
  return <>
    <button className={styles.primaryButton} disabled={!available || success || role === "ADMIN"}
      onClick={() => {
        if (!role) { router.push(`/login?next=${encodeURIComponent(`/koleksi/${bookId}`)}`); return; }
        setError(""); dialog.current?.showModal();
      }}>
      {success ? "Reservasi Berhasil" : available ? "Ajukan Peminjaman" : "Tidak Tersedia"}
    </button>
    {role === "ADMIN" && <p className={styles.ctaNotice}>Reservasi tersedia untuk akun anggota.</p>}
    {success && <p className={styles.ctaNotice} role="status">Reservasi berhasil dibuat. Ambil buku dalam 24 jam. <Link href="/dashboard/reservasi">Lihat Reservasi Saya</Link></p>}
    <dialog ref={dialog} className={styles.reservationDialog} aria-labelledby="reservation-title" onCancel={(event) => { if (pending) event.preventDefault(); }}>
      <h2 id="reservation-title">Konfirmasi Reservasi</h2>
      <p>Anda akan mereservasi buku ini selama <strong>24 jam</strong>. Buku harus diambil sebelum batas waktu reservasi berakhir.</p>
      <p>Masa pinjam 7 hari dimulai setelah petugas mengonfirmasi pengambilan. Tidak ada denda uang.</p>
      {error && <p role="alert" className={styles.ctaNotice}>{error}</p>}
      <div className={styles.actionRow}>
        <button className={styles.detailLink} disabled={pending} onClick={() => dialog.current?.close()}>Batal</button>
        <button className={styles.primaryButton} disabled={pending} onClick={reserve}>{pending ? "Memproses..." : "Konfirmasi Reservasi"}</button>
      </div>
    </dialog>
  </>;
}
