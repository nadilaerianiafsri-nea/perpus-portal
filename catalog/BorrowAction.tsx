"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import styles from "./Catalog.module.css";

type BorrowStatus = "checking" | "available" | "active";

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
  const [borrowStatus, setBorrowStatus] = useState<BorrowStatus>(
    role === "PENGUNJUNG" ? "checking" : "available",
  );

  useEffect(() => {
    if (role !== "PENGUNJUNG") {
      setBorrowStatus("available");
      return;
    }

    const controller = new AbortController();
    setBorrowStatus("checking");

    void fetch(`/api/members/me/books/${bookId}/borrowing-status`, {
      cache: "no-store",
      credentials: "same-origin",
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;

        if (response.status === 409) {
          setBorrowStatus("active");
          return;
        }

        setBorrowStatus("available");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setBorrowStatus("available");
        }
      });

    return () => controller.abort();
  }, [bookId, role]);

  async function reserve() {
    if (locked.current) return;

    locked.current = true;
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/members/me/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
        signal: AbortSignal.timeout(16000),
      });
      const data = await response.json().catch(() => null);

      if (response.status === 401) {
        router.push(
          `/login?next=${encodeURIComponent(`/koleksi/${bookId}`)}`,
        );
        return;
      }

      if (response.status === 409) {
        dialog.current?.close();
        setBorrowStatus("active");
        setError("");
        return;
      }

      if (!response.ok) {
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Reservasi belum berhasil. Silakan coba lagi.",
        );
        return;
      }

      dialog.current?.close();
      setSuccess(true);
      setBorrowStatus("active");
      router.refresh();
    } catch {
      setError(
        "Layanan reservasi belum dapat dihubungi. Silakan coba lagi.",
      );
    } finally {
      setPending(false);
      locked.current = false;
    }
  }

  const titleBlocked =
    role === "PENGUNJUNG" && borrowStatus !== "available";

  const buttonLabel =
    role === "PENGUNJUNG" && borrowStatus === "checking"
      ? "Memeriksa..."
      : role === "PENGUNJUNG" && borrowStatus === "active"
        ? "Judul Sedang Aktif"
        : available
          ? "Ajukan Peminjaman"
          : "Tidak Tersedia";

  return (
    <>
      <button
        className={styles.primaryButton}
        disabled={!available || role === "ADMIN" || titleBlocked}
        onClick={() => {
          if (!role) {
            router.push(
              `/login?next=${encodeURIComponent(`/koleksi/${bookId}`)}`,
            );
            return;
          }

          setError("");
          dialog.current?.showModal();
        }}
      >
        {buttonLabel}
      </button>

      {role === "ADMIN" && (
        <p className={styles.ctaNotice}>
          Reservasi tersedia untuk akun anggota.
        </p>
      )}

      {success && (
        <p className={styles.ctaNotice} role="status">
          Reservasi berhasil dibuat. Ambil buku dalam 24 jam.{" "}
          <Link href="/dashboard/reservasi">Lihat Reservasi Saya</Link>
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
          <button
            className={styles.detailLink}
            disabled={pending}
            onClick={() => dialog.current?.close()}
          >
            Batal
          </button>
          <button
            className={styles.primaryButton}
            disabled={pending}
            onClick={reserve}
          >
            {pending ? "Memproses..." : "Konfirmasi Reservasi"}
          </button>
        </div>
      </dialog>
    </>
  );
}
