import { notFound } from "next/navigation";
import AdminReservationDetail from "@/admin/AdminReservationDetail";

export default async function ReservationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anggota?: string | string[] }>;
}) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!/^\d+$/.test(rawId) || !Number.isSafeInteger(id) || id <= 0) notFound();

  const rawMemberId = query.anggota;
  const parsedMemberId = typeof rawMemberId === "string" && /^\d+$/.test(rawMemberId)
    ? Number(rawMemberId) : null;
  const memberId = parsedMemberId !== null && Number.isSafeInteger(parsedMemberId) && parsedMemberId > 0
    ? parsedMemberId : null;

  return <AdminReservationDetail id={id} memberId={memberId} />;
}
