"use client";

import { useCallback, useRef, useState } from "react";
import { reservationActionLabel } from "./adminReservations";
import { confirmReservationPickup } from "./reservationPickup";
import type { ReservationRow } from "./adminTransactions";

type PickupTarget = { id: number; memberName: string; bookTitle: string };

export function useReservationPickup(onSuccess: (id: number) => void | Promise<void>) {
  const [target, setTarget] = useState<PickupTarget | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const locked = useRef(false);

  const reset = useCallback(() => { setTarget(null); setError(""); }, []);

  function open(reservation: ReservationRow) {
    if (locked.current || reservationActionLabel(reservation.status) !== "Sudah Diambil") return;
    setError("");
    setTarget({ id: reservation.id, memberName: reservation.member.name, bookTitle: reservation.book.title });
  }

  function cancel() { if (!locked.current) setTarget(null); }

  async function confirm() {
    if (!target || locked.current) return;
    locked.current = true;
    setPending(true);
    setError("");
    try {
      await confirmReservationPickup(target.id);
      setTarget(null);
      await onSuccess(target.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Pengambilan buku gagal dikonfirmasi.");
    } finally {
      locked.current = false;
      setPending(false);
    }
  }

  return { target, pending, error, open, cancel, confirm, reset };
}

export type ReservationPickup = ReturnType<typeof useReservationPickup>;
