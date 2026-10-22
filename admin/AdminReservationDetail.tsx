/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiBookOpen, FiCheckCircle, FiClock, FiInfo, FiUser } from "react-icons/fi";
import { Button } from "@/components/Button";
import ConfirmDialog from "@/components/ConfirmDialog";
import { safeCoverUrl } from "../shared/displayUrls.cjs";
import type { AdminBookDetailResponse } from "./adminBooks";
import { loadReservation, reservationStatusLabel } from "./adminReservations";
import {
  formatTransactionDateTime,
  memberTypeLabel,
  transactionApiMessage,
  type ReservationRow,
} from "./adminTransactions";
import styles from "./AdminReservationDetail.module.css";

type PickupTarget = {
  id: number;
  memberName: string;
  bookTitle: string;
};

type BookLocation = { location: string; shelf: string; copyLocation: string };

const backHref = "/admin/transaksi/reservasi";

export default function AdminReservationDetail({ id, memberId }: { id: number; memberId: number | null }) {
  const [reservation, setReservation] = useState<ReservationRow | null>(null);
  const [location, setLocation] = useState<BookLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [pickupTarget, setPickupTarget] = useState<PickupTarget | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");
      setLoadError("");
      setReservation(null);
      setLocation(null);
      setPickupTarget(null);

      try {
        const row = await loadReservation(id, memberId, controller.signal);
        if (!controller.signal.aborted) setReservation(row);
      } catch (reason) {
        if (!controller.signal.aborted) {
          setLoadError(reason instanceof Error ? reason.message : "Detail reservasi belum dapat dimuat.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [id, memberId, revision]);

  useEffect(() => {
    if (!reservation) return;
    const controller = new AbortController();
    const row = reservation;

    async function loadLocation() {
      try {
        const response = await fetch(`/api/admin/books/${row.book.id}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = (await response.json()) as AdminBookDetailResponse;
        if (controller.signal.aborted || !payload.book) return;
        const copy = payload.book.copies?.find((item) => item.id === row.copy.id);
        setLocation({
          location: payload.book.location || "",
          shelf: payload.book.shelf || "",
          copyLocation: copy?.location || "",
        });
      } catch {
        // Optional book-location information must not block reservation processing.
      }
    }

    void loadLocation();
    return () => controller.abort();
  }, [reservation]);

  async function confirmPickup() {
    if (!pickupTarget || processingId !== null) return;

    setProcessingId(pickupTarget.id);
    setError("");

    try {
      const response = await fetch(
        `/api/members/admin/reservations/${pickupTarget.id}/pickup`,
        {
          method: "POST",
        },
      );

      if (!response.ok) {
        throw new Error(
          await transactionApiMessage(
            response,
            "Pengambilan buku gagal dikonfirmasi.",
          ),
        );
      }

      setPickupTarget(null);
      setRevision((value) => value + 1);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Pengambilan buku gagal dikonfirmasi.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  const waiting = reservation?.status === "MENUNGGU_PENGAMBILAN";
  const title = waiting ? "Proses Reservasi" : "Detail Reservasi";
  const statusTone = waiting ? styles.waiting : reservation?.status === "DIAMBIL"
    ? styles.pickedUp : reservation?.status === "KEDALUWARSA" ? styles.expired : styles.cancelled;

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingText}>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href={backHref}>Reservasi</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>
          <h1 data-page-title>{title}</h1>
        </div>
        <Link href={backHref} data-button="back" data-button-size="md">
          <FiArrowLeft aria-hidden="true" /> Kembali
        </Link>
      </header>

      {loading ? (
        <section className={styles.statePanel} aria-live="polite" aria-busy="true">
          <FiClock aria-hidden="true" />
          <p>Memuat detail reservasi...</p>
        </section>
      ) : loadError ? (
        <section className={styles.statePanel} role="alert">
          <FiInfo aria-hidden="true" />
          <h2>Detail reservasi belum dapat ditampilkan</h2>
          <p>{loadError}</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>Coba Lagi</Button>
        </section>
      ) : !reservation ? (
        <section className={styles.statePanel}>
          <FiInfo aria-hidden="true" />
          <h2>Reservasi tidak ditemukan</h2>
          <p>Reservasi ini tidak tersedia. Kembali ke daftar untuk memilih reservasi lain.</p>
          <Button variant="secondary" onClick={() => setRevision((value) => value + 1)}>Coba Lagi</Button>
        </section>
      ) : (
        <>
          <div className={styles.informationGrid}>
            <section className={styles.card} aria-labelledby="reservation-member-title">
              <h2 id="reservation-member-title"><FiUser aria-hidden="true" /> Informasi Anggota</h2>
              <dl className={styles.fields}>
                <div><dt>Nama anggota</dt><dd className={styles.prominent}>{reservation.member.name}</dd></div>
                <div><dt>Jenis anggota</dt><dd>{memberTypeLabel(reservation.member.memberType)}</dd></div>
                <div><dt>Email</dt><dd>{reservation.member.email || "—"}</dd></div>
                <div><dt>WhatsApp</dt><dd>{reservation.member.whatsapp || "—"}</dd></div>
              </dl>
            </section>

            <section className={styles.card} aria-labelledby="reservation-book-title">
              <h2 id="reservation-book-title"><FiBookOpen aria-hidden="true" /> Informasi Buku</h2>
              <div className={styles.book}>
                <img src={safeCoverUrl(reservation.book.coverUrl)} alt={`Sampul ${reservation.book.title}`} />
                <dl className={styles.fields}>
                  <div><dt>Judul buku</dt><dd className={styles.prominent}>{reservation.book.title}</dd></div>
                  <div><dt>Kode buku</dt><dd>{reservation.book.code}</dd></div>
                  <div><dt>Kode eksemplar</dt><dd>{reservation.copy.code}</dd></div>
                </dl>
              </div>
              {location && (location.location || location.shelf || location.copyLocation) ? (
                <dl className={`${styles.fields} ${styles.locationFields}`}>
                  {location.location ? <div><dt>Lokasi buku</dt><dd>{location.location}</dd></div> : null}
                  {location.shelf ? <div><dt>Rak</dt><dd>{location.shelf}</dd></div> : null}
                  {location.copyLocation ? <div><dt>Lokasi eksemplar</dt><dd>{location.copyLocation}</dd></div> : null}
                </dl>
              ) : null}
            </section>
          </div>

          <section className={styles.card} aria-labelledby="reservation-information-title">
            <h2 id="reservation-information-title"><FiClock aria-hidden="true" /> Informasi Reservasi</h2>
            <dl className={`${styles.fields} ${styles.reservationFields}`}>
              <div><dt>Status reservasi</dt><dd><span className={`${styles.status} ${statusTone}`}>{reservationStatusLabel(reservation.status)}</span></dd></div>
              <div><dt>Waktu reservasi</dt><dd>{formatTransactionDateTime(reservation.createdAt)}</dd></div>
              <div><dt>Batas pengambilan</dt><dd>{formatTransactionDateTime(reservation.expiresAt)}</dd></div>
              {reservation.pickedUpAt ? <div><dt>Waktu pengambilan</dt><dd>{formatTransactionDateTime(reservation.pickedUpAt)}</dd></div> : null}
              {reservation.cancelledAt ? <div><dt>Waktu pembatalan</dt><dd>{formatTransactionDateTime(reservation.cancelledAt)}</dd></div> : null}
            </dl>
          </section>

          <section className={styles.actionPanel} aria-label="Pengambilan reservasi">
            {error && !pickupTarget ? <p className={styles.mutationError} role="alert">{error}</p> : null}
            <div className={styles.note}>
              <FiInfo aria-hidden="true" />
              <p>{waiting
                ? "Pastikan buku sudah diserahkan kepada anggota. Konfirmasi pengambilan akan membuat pinjaman aktif dan memulai masa peminjaman."
                : `Reservasi berstatus ${reservationStatusLabel(reservation.status).toLowerCase()}.`}</p>
            </div>
            <div className={styles.actions}>
              <Link href={backHref} data-button="secondary" data-button-size="md">{waiting ? "Batal" : "Kembali ke Daftar"}</Link>
              {waiting && !loading && !loadError ? (
                <Button
                  className={styles.confirmButton}
                  variant="primary"
                  size="md"
                  icon={<FiCheckCircle />}
                  loading={processingId !== null}
                  loadingLabel="Mengonfirmasi..."
                  onClick={() => {
                    setError("");
                    setPickupTarget({ id: reservation.id, memberName: reservation.member.name, bookTitle: reservation.book.title });
                  }}
                >Konfirmasi Pengambilan</Button>
              ) : null}
            </div>
          </section>
        </>
      )}

      {pickupTarget ? (
        <ConfirmDialog
          open
          title="Konfirmasi Pengambilan"
          description="Periksa kembali sebelum mengonfirmasi pengambilan."
          variant="primary"
          confirmLabel="Konfirmasi Pengambilan"
          loadingLabel="Mengonfirmasi..."
          pending={processingId !== null}
          error={error}
          onConfirm={confirmPickup}
          onCancel={() => setPickupTarget(null)}
        >
          <ul>
            <li><strong>Anggota:</strong> {pickupTarget.memberName}</li>
            <li><strong>Buku:</strong> {pickupTarget.bookTitle}</li>
            <li>Pastikan buku sudah diserahkan kepada anggota.</li>
            <li>Reservasi akan berubah menjadi pinjaman aktif.</li>
          </ul>
        </ConfirmDialog>
      ) : null}
    </div>
  );
}
