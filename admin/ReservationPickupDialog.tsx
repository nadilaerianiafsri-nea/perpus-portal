"use client";

import ConfirmDialog from "@/components/ConfirmDialog";
import type { ReservationPickup } from "./useReservationPickup";

export default function ReservationPickupDialog({ pickup }: { pickup: ReservationPickup }) {
  if (!pickup.target) return null;
  return <ConfirmDialog open title="Konfirmasi Pengambilan"
    description="Pastikan buku telah benar-benar diambil oleh anggota. Setelah dikonfirmasi, reservasi akan menjadi pinjaman aktif."
    variant="primary" confirmLabel="Sudah Diambil" loadingLabel="Mengonfirmasi..."
    pending={pickup.pending} error={pickup.error} onConfirm={pickup.confirm} onCancel={pickup.cancel}>
    <ul>
      <li><strong>Anggota:</strong> {pickup.target.memberName}</li>
      <li><strong>Buku:</strong> {pickup.target.bookTitle}</li>
    </ul>
  </ConfirmDialog>;
}
