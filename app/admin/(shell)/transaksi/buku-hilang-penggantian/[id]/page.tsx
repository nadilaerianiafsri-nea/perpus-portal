import { notFound } from "next/navigation";
import AdminLostBookDetail from "@/admin/AdminLostBookDetail";
import { parseLoanDetailId } from "@/admin/adminLoanDetails";
export default async function LostBookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseLoanDetailId(rawId);
  if (id === null) notFound();
  return <AdminLostBookDetail key={id} id={id} />;
}
