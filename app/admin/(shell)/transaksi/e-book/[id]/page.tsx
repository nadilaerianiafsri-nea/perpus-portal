import { notFound } from "next/navigation";
import AdminEBookCirculationDetail from "@/admin/AdminEBookCirculationDetail";
import { parseLoanDetailId } from "@/admin/adminLoanDetails";

export default async function CirculationDetailPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ jenis?: string | string[] }>;
}) {
  const [{ id: rawId }, { jenis }] = await Promise.all([params, searchParams]);
  const id = parseLoanDetailId(rawId);
  if (id === null || (jenis !== "akses" && jenis !== "antrean")) notFound();
  return <AdminEBookCirculationDetail id={id} kind={jenis === "akses" ? "loan" : "queue"} />;
}
