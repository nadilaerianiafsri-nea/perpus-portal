"use client";

import { ButtonLabel } from '@/components/Button';
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./Catalog.module.css";

type BorrowStatus =
  | "checking"
  | "available"
  | "reservation"
  | "loan"
  | "ebook"
  | "blocked"
  | "error";
function conflictStatus(code: unknown): BorrowStatus {
  return code === "ACTIVE_RESERVATION"
    ? "reservation"
    : code === "ACTIVE_LOAN"
      ? "loan"
      : code === "ACTIVE_EBOOK"
        ? "ebook"
        : "blocked";
}

export default function BorrowAction({
  available,
  bookId,
  role,
}: {
  available: boolean;
  bookId: number;
  role: "ADMIN" | "PENGUNJUNG" | null;
}) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const locked = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [stockChanged, setStockChanged] = useState(false);
  const [borrowStatus, setBorrowStatus] = useState<BorrowStatus>("checking");
  const loginHref = `/login?returnUrl=${encodeURIComponent(`/dashboard/koleksi/${bookId}`)}`;

  const checkStatus = useCallback(
    async (signal?: AbortSignal): Promise<BorrowStatus> => {
      setBorrowStatus("checking");
      try {
        const response = await fetch(
          `/api/members/me/books/${bookId}/borrowing-status`,
          {
            cache: "no-store",
            credentials: "same-origin",
            signal: signal
              ? AbortSignal.any([signal, AbortSignal.timeout(12000)])
              : AbortSignal.timeout(12000),
          },
        );
        const data = await response.json().catch(() => null);
        if (signal?.aborted) return "checking";
        if (response.status === 401) {
          router.replace(loginHref);
          return "checking";
        }
        const status =
          response.status === 409
            ? conflictStatus(data?.code)
            : response.ok
              ? "available"
              : "error";
        setBorrowStatus(status);
        return status;
      } catch {
        if (!signal?.aborted) setBorrowStatus("error");
        return "error";
      }
    },
    [bookId, loginHref, router],
  );

  useEffect(() => {
    if (role !== "PENGUNJUNG") return;
    const controller = new AbortController();
    // Synchronize the existing personal borrowing-status endpoint on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void checkStatus(controller.signal);
    return () => controller.abort();
  }, [checkStatus, role]);

  async function reserve() {
    if (
      locked.current ||
      role !== "PENGUNJUNG" ||
      borrowStatus !== "available" ||
      !available ||
      stockChanged
    )
      return;
    locked.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/members/me/reservations", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
        signal: AbortSignal.timeout(16000),
      });
      const data = await response.json().catch(() => null);
      if (response.status === 401) {
        router.push(loginHref);
        return;
      }
      if (response.status === 409) {
        dialog.current?.close();
        if (data?.code) setBorrowStatus(conflictStatus(data.code));
        else {
          const status = await checkStatus();
          if (status === "available") {
            setStockChanged(true);
            setError(
              "Ketersediaan buku berubah. Silakan periksa kembali katalog.",
            );
          }
        }
        router.refresh();
        return;
      }
      if (!response.ok) {
        setError(
          response.status === 400 && typeof data?.message === "string"
            ? data.message
            : "Reservasi belum berhasil. Silakan coba lagi.",
        );
        return;
      }
      dialog.current?.close();
      setSuccess(true);
      setBorrowStatus("reservation");
      router.refresh();
    } catch {
      setError("Layanan reservasi belum dapat dihubungi. Silakan coba lagi.");
    } finally {
      setPending(false);
      locked.current = false;
    }
  }

  if (role === "ADMIN")
    return (
      <p className={styles.ctaNotice}>Reservasi tersedia untuk akun anggota.</p>
    );
  if (role === null)
    return (
      <Link data-button="primary" data-button-size="md" className={styles.primaryButton} href={loginHref}>
        Masuk untuk Ajukan Peminjaman
      </Link>
    );
  if (borrowStatus === "checking")
    return (
      <p className={styles.ctaNotice} role="status">
        Memeriksa status peminjaman...
      </p>
    );
  if (borrowStatus === "error")
    return (
      <div>
        <p className={styles.ctaNotice} role="alert">
          Status peminjaman belum dapat dimuat.
        </p>
        <button data-button="primary" data-button-size="md"
          className={styles.detailLink}
          onClick={() => void checkStatus()}
        >
          Coba Lagi
        </button>
      </div>
    );
  if (borrowStatus === "reservation")
    return (
      <div>
        <p className={styles.ctaNotice} role="status">
          {success
            ? "Reservasi berhasil dibuat. Ambil buku dalam 24 jam."
            : "Reservasi Aktif"}
        </p>
        <Link data-button="secondary" data-button-size="md" className={styles.detailLink} href="/dashboard/reservasi">
          Lihat Reservasi Saya
        </Link>
      </div>
    );
  if (borrowStatus === "blocked")
    return (
      <p className={styles.ctaNotice}>
        Judul tidak dapat direservasi saat ini.
      </p>
    );
  if (borrowStatus === "loan" || borrowStatus === "ebook")
    return (
      <div>
        <p className={styles.ctaNotice}>
          {borrowStatus === "loan" ? "Pinjaman Aktif" : "Judul Sedang Aktif"}
        </p>
        <Link data-button="secondary" data-button-size="md"
          className={styles.detailLink}
          href={
            borrowStatus === "loan"
              ? "/dashboard/pinjaman"
              : "/dashboard/e-book"
          }
        >
          {borrowStatus === "loan"
            ? "Lihat Pinjaman Saya"
            : "Lihat E-Book Saya"}
        </Link>
      </div>
    );
  return (
    <>
      <button aria-busy={pending} data-button="primary" data-button-size="md"
        className={styles.primaryButton}
        type="button"
        disabled={!available || stockChanged || pending}
        onClick={() => {
          setError("");
          dialog.current?.showModal();
        }}
      >
        {!available || stockChanged ? "Tidak Tersedia" : "Ajukan Peminjaman"}
      </button>
      {error && (
        <p role="alert" className={styles.ctaNotice}>
          {error}
        </p>
      )}
      <dialog
        ref={dialog}
        className={styles.reservationDialog}
        aria-labelledby="reservation-title"
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <h2 id="reservation-title">Konfirmasi Reservasi</h2>
        <p>
          Anda akan mereservasi buku ini selama <strong>24 jam</strong>. Buku
          harus diambil sebelum batas waktu reservasi berakhir.
        </p>
        <p>
          Masa pinjam 7 hari dimulai setelah petugas mengonfirmasi pengambilan.
          Tidak ada denda uang.
        </p>
        {error && (
          <p role="alert" className={styles.ctaNotice}>
            {error}
          </p>
        )}
        <div className={styles.actionRow}>
          <button aria-busy={pending} data-button="ghost" data-button-size="md"
            className={styles.detailLink}
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            Batal
          </button>
          <button aria-busy={pending} data-button="primary" data-button-size="md"
            className={styles.primaryButton}
            disabled={pending}
            onClick={() => void reserve()}
          >
            <ButtonLabel loading={pending} pending="Memproses...">Konfirmasi Reservasi</ButtonLabel>
          </button>
        </div>
      </dialog>
    </>
  );
}
