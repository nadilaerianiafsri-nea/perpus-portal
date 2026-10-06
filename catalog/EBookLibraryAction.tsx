"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "./Catalog.module.css";
export default function EBookLibraryAction({ bookId, role }: {
  bookId: number; role: "ADMIN" | "PENGUNJUNG" | null;
}) {
  const router = useRouter();
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [saved, setSaved] = useState(false);
  async function save() {
    if (!role) { router.push(`/login?next=${encodeURIComponent(`/koleksi/${bookId}`)}`); return; }
    if (locked.current) return;
    locked.current = true; setPending(true); setNotice("");
    try {
      const response = await fetch("/api/members/me/ebooks", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }), signal: AbortSignal.timeout(16000),
      });
      const data = await response.json();
      if (response.status === 401) { router.push(`/login?next=${encodeURIComponent(`/koleksi/${bookId}`)}`); return; }
      if (!response.ok) { setNotice(typeof data.message === "string" ? data.message : "E-Book belum dapat disimpan."); return; }
      setSaved(true); setNotice("E-Book berhasil disimpan.");
    } catch { setNotice("Layanan anggota belum dapat dihubungi. Silakan coba lagi."); }
    finally { setPending(false); locked.current = false; }
  }
  if (role === "ADMIN") return null;
  return <div className={styles.libraryAction}>
    <button className={styles.detailLink} disabled={pending || saved} onClick={save}>
      {pending ? "Menyimpan..." : saved ? "Tersimpan di E-Book Saya" : "Simpan ke E-Book Saya"}
    </button>
    {notice && <p className={styles.ctaNotice} role="status">{notice} {saved && <Link href="/dashboard/e-book">Lihat E-Book Saya</Link>}</p>}
  </div>;
}
