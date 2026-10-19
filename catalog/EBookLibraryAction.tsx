"use client";

import { ButtonLabel } from '@/components/Button';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EBookCirculationStatus } from "@/members/types";
import { normalizeMemberEBooksPayload } from "@/members/ebookPayload";
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
  const [progress, setProgress] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    if (role !== "PENGUNJUNG") return false;
    setLoading(true);
    try {
      const [response, history] = await Promise.all([
        fetch(`/api/members/me/ebooks/${bookId}/status`, {
          credentials: "same-origin",
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        }),
        // Read the existing library resource; opening/tracking still belongs to the reader.
        fetch("/api/members/me/ebooks", {
          credentials: "same-origin",
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        })
          .then(async (response) => (response.ok ? response.json() : null))
          .catch(() => null),
      ]);
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        router.replace(
          `/login?returnUrl=${encodeURIComponent(`/dashboard/koleksi/${bookId}`)}`,
        );
        return false;
      }
      if (!response.ok) {
        throw new Error(
          typeof data?.message === "string"
            ? data.message
            : "Status E-Book belum dapat dimuat.",
        );
      }
      setStatus(data as EBookCirculationStatus);
      const library = normalizeMemberEBooksPayload(history);
      const reading =
        library.readHistory.find((item) => item.bookId === bookId) ??
        library.activeLoans.find((item) => item.bookId === bookId)?.reading;
      setProgress(reading?.progress ?? 0);
      setNotice("");
      return true;
    } catch (failure) {
      setStatus(null);
      setNotice(
        failure instanceof Error && failure.name === "Error"
          ? failure.message
          : "Status E-Book belum dapat dimuat. Silakan coba lagi.",
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, [bookId, role, router]);

  useEffect(() => {
    // Synchronize the existing circulation resource on mount/book changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (status?.state !== "OFFERED_TO_ME") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [status?.state]);

  async function act(path: string, successMessage: string) {
    if (!role) {
      router.push(
        `/login?returnUrl=${encodeURIComponent(`/dashboard/koleksi/${bookId}`)}`,
      );
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
        router.push(
          `/login?returnUrl=${encodeURIComponent(`/dashboard/koleksi/${bookId}`)}`,
        );
        return;
      }
      if (!response.ok) {
        if (response.status === 409) await load();
        setNotice(
          typeof data?.message === "string"
            ? data.message
            : "Aksi E-Book belum dapat diproses.",
        );
        return;
      }
      if (await load()) setNotice(successMessage);
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
        <button data-button="primary" data-button-size="md"
          className={styles.detailLink}
          type="button"
          onClick={() =>
            router.push(
              `/login?returnUrl=${encodeURIComponent(`/dashboard/koleksi/${bookId}`)}`,
            )
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
        <button aria-busy={pending} data-button="primary" data-button-size="md"
          className={styles.primaryButton}
          type="button"
          disabled={pending}
          onClick={() =>
            void act("borrow", "E-Book berhasil dipinjam selama 7 hari.")
          }
        >
          <ButtonLabel loading={pending} pending="Memproses...">Pinjam E-Book</ButtonLabel>
        </button>
      ) : null}

      {status?.state === "BORROWED_BY_OTHER" ? (
        <button aria-busy={pending} data-button="primary" data-button-size="md"
          className={styles.detailLink}
          type="button"
          disabled={pending}
          onClick={() =>
            void act("queue", "Anda berhasil masuk antrean E-Book.")
          }
        >
          <ButtonLabel loading={pending} pending="Memproses...">Masuk Antrean</ButtonLabel>
        </button>
      ) : null}

      {status?.state === "BORROWED_BY_ME" ? (
        <>
          <p className={styles.ctaNotice}>Akses E-Book aktif.</p>
          <Link data-button="primary" data-button-size="md"
            className={styles.primaryButton}
            href={`/e-book/${bookId}/baca`}
          >
            {progress >= 100
              ? "Baca Lagi"
              : progress > 0
                ? "Lanjut Baca"
                : "Baca E-Book"}
          </Link>
          <button aria-busy={pending} data-button="success" data-button-size="md"
            className={styles.detailLink}
            type="button"
            disabled={pending}
            onClick={() => void act("return", "E-Book berhasil dikembalikan.")}
          >
            <ButtonLabel loading={pending} pending="Memproses...">Kembalikan E-Book</ButtonLabel>
          </button>
        </>
      ) : null}

      {status?.state === "QUEUED" ? (
        <>
          <p className={styles.ctaNotice}>
            Anda sedang dalam antrean. Posisi antrean:{" "}
            <strong>
              {status.queue?.position
                ? `#${status.queue.position}`
                : "Sedang diperbarui"}
            </strong>
          </p>
          <button aria-busy={pending} data-button="danger" data-button-size="md"
            className={styles.detailLink}
            type="button"
            disabled={pending}
            onClick={() =>
              void act("queue/cancel", "Antrean E-Book berhasil dibatalkan.")
            }
          >
            <ButtonLabel loading={pending} pending="Memproses...">Batalkan Antrean</ButtonLabel>
          </button>
        </>
      ) : null}

      {status?.state === "OFFERED_TO_ME" ? (
        <>
          <p className={styles.ctaNotice}>
            <strong>Giliran Anda tersedia.</strong> Sisa prioritas:{" "}
            {formatRemaining(status.queue?.claimExpiresAt, now)}.
          </p>
          <button aria-busy={pending} data-button="primary" data-button-size="md"
            className={styles.primaryButton}
            type="button"
            disabled={pending}
            onClick={() =>
              void act("borrow", "E-Book berhasil dipinjam selama 7 hari.")
            }
          >
            <ButtonLabel loading={pending} pending="Memproses...">Pinjam E-Book</ButtonLabel>
          </button>
          <button aria-busy={pending} data-button="danger" data-button-size="md"
            className={styles.detailLink}
            type="button"
            disabled={pending}
            onClick={() =>
              void act("queue/cancel", "Antrean E-Book berhasil dibatalkan.")
            }
          >
            <ButtonLabel loading={pending} pending="Memproses...">Batalkan Antrean</ButtonLabel>
          </button>
        </>
      ) : null}

      {status?.state === "UNAVAILABLE" ? (
        <p className={styles.ctaNotice}>
          E-Book sedang tidak tersedia untuk dipinjam.
        </p>
      ) : null}

      {notice ? (
        <p className={styles.ctaNotice} role="status">
          {notice} <Link href="/dashboard/e-book">Lihat E-Book Saya</Link>
        </p>
      ) : null}
      {!status && notice ? (
        <button data-button="primary" data-button-size="md"
          className={styles.detailLink}
          type="button"
          onClick={() => void load()}
        >
          Coba Lagi
        </button>
      ) : null}
    </div>
  );
}
