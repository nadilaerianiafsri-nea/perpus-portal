import { transactionApiMessage } from "./adminTransactions";

/** Existing pickup operation; all status/stock/loan rules stay on the backend. */
export async function confirmReservationPickup(id: number, request: typeof fetch = fetch) {
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new Error("ID reservasi tidak valid.");
  const response = await request(`/api/members/admin/reservations/${id}/pickup`, { method: "POST" });
  if (!response.ok) throw new Error(await transactionApiMessage(response, "Pengambilan buku gagal dikonfirmasi."));
}
