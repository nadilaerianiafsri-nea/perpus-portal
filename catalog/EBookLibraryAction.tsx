"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EBookCirculationStatus } from "@/members/types";
import styles from "./Catalog.module.css";

function formatRemaining(deadline: string | null | undefined, now: number) {
  if (!deadline) return "";
  const remaining = Math.max(0, new Date(deadline).getTime() - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return `${hours} jam ${minutes} menit ${seconds} detik`;
}

export default function EBookLibraryAction({
  bookId,
  role,
}: {
  bookId: number;
  role: "ADMIN" | "PENGUNJUNG" | null;
}) {
  const router = useRouter();
  const locked = useRef(false);
  const [status, setStatus] = useState<EBookCirculationStatus | null>(null);
  const [loading, setLoading] = useState(role === "PENGUNJUNG");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    if (role !== "PENGUNJUNG") return;
    setLoading(true);
    try {
      const response = await fetch(`/api/members/me/ebooks/${bookId}/status`, {
        credentials: "same-origin",
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(`/koleksi/${bookId}`)}`);
        return;
      }
      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Status E-Book belum dapat dimuat.",
        );
      }
      setStatus(data as EBookCirculationStatus);
      setNotice("");
    } catch (failure) {
      setNotice(
        failure instanceof Error
          ? failure.message
          : "Status E-Book belum dapat dimuat. Silakan coba lagi.",
      );
    } finally {
      setLoading(false);
    }
  }, [bookId, role, router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status?.state !== "OFFERED_TO_ME") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status?.state]);

  async function act(path: string, successMessage: string) {
    if (!role) {
      router.push(`/login?next=${encodeURIComponent(`/koleksi/${bookId}`)}`);
      return;
    }
    if (role !== "PENGUNJUNG" || locked.current) return;
    locked.current = true;
    setPending(true);
    setNotice("");
    try {
      const response = await fetch(`/api/members/me/ebooks/${bookId}/${path}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: "{}",
        signal: AbortSignal.timeout(16000),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        router.push(`/login?next=${encodeURIComponent(`/koleksi/${bookId}`)}`);
        return;
      }
      if (!response.ok) {
        setNotice(
          typeof data?.message === "string"
            ? data.message
            : "Aksi E-Book belum dapat diproses.",
        );
        return;
      }
      setNotice(successMessage);
      await load();
      router.refresh();
    } catch {
      setNotice("Layanan anggota belum dapat dihubungi. Silakan coba lagi.");
    } finally {
      setPending(false);
      locked.current = false;
    }
  }

  if (role === "ADMIN") return null;

  if (!role) {
    return (
      <div className={styles.libraryAction}>
        <button
          className={styles.detailLink}
          type="button"
          onClick={() =>
            router.push(`/login?next=${encodeURIComponent(`/koleksi/${bookId}`)}`)
          }
        >
          Masuk untuk Pinjam E-Book
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.libraryAction}>
        <p className={styles.ctaNotice}>Memeriksa ketersediaan E-Book...</p>
      </div>
    );
  }

  return (
    <div className={styles.libraryAction}>
      {status?.state === "AVAILABLE" ? (
        <button
          className={styles.detailLink}
          type="button"
          disabled={pending}
          onClick={() => void act("borrow", "E-Book berhasil dipinjam selama 7 hari.")}
        >
          {pending ? "Memproses..." : "Pinjam E-Book"}
        </button>
      ) : null}

      {status?.state === "BORROWED_BY_OTHER" ? (
        <button
          className={styles.detailLink}
          type="button"
          disabled={pending}
          onClick={() => void act("queue", "Anda berhasil masuk antrean E-Book.")}
        >
          {pending ? "Memproses..." : "Masuk Antrean"}
        </button>
      ) : null}

      {status?.state === "BORROWED_BY_ME" ? (
        <>
          <Link className={styles.primaryButton} href={`/e-book/${bookId}/baca`}>
            Baca E-Book
          </Link>
          <button
            className={styles.detailLink}
            type="button"
            disabled={pending}
            onClick={() => void act("return", "E-Book berhasil dikembalikan.")}
          >
            {pending ? "Memproses..." : "Kembalikan E-Book"}
          </button>
        </>
      ) : null}

      {status?.state === "QUEUED" ? (
        <>
          <p className={styles.ctaNotice}>
            Posisi antrean Anda: <strong>#{status.queue?.position ?? "-"}</strong>
          </p>
          <button
            className={styles.detailLink}
            type="button"
            disabled={pending}
            onClick={() => void act("queue/cancel", "Antrean E-Book berhasil dibatalkan.")}
          >
            {pending ? "Memproses..." : "Batalkan Antrean"}
          </button>
        </>
      ) : null}

      {status?.state === "OFFERED_TO_ME" ? (
        <>
          <p className={styles.ctaNotice}>
            <strong>Giliran Anda tersedia.</strong> Sisa prioritas: {formatRemaining(status.queue?.claimExpiresAt, now)}.
          </p>
          <button
            className={styles.detailLink}
            type="button"
            disabled={pending}
            onClick={() => void act("borrow", "E-Book berhasil dipinjam selama 7 hari.")}
          >
            {pending ? "Memproses..." : "Pinjam E-Book"}
          </button>
          <button
            className={styles.detailLink}
            type="button"
            disabled={pending}
            onClick={() => void act("queue/cancel", "Antrean E-Book berhasil dibatalkan.")}
          >
            Batalkan Antrean
          </button>
        </>
      ) : null}

      {status?.state === "UNAVAILABLE" ? (
        <p className={styles.ctaNotice}>E-Book sedang tidak tersedia untuk dipinjam.</p>
      ) : null}

      {notice ? (
        <p className={styles.ctaNotice} role="status">
          {notice} <Link href="/dashboard/e-book">Lihat E-Book Saya</Link>
        </p>
      ) : null}
    </div>
  );
}
