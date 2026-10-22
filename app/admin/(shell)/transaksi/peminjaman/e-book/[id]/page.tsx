import { notFound } from "next/navigation";
import AdminLoanDetail from "@/admin/AdminLoanDetail";
import { parseLoanDetailId } from "@/admin/adminLoanDetails";

export default async function EbookAccessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseLoanDetailId(rawId);
  if (id === null) notFound();
  return <AdminLoanDetail id={id} kind="ebook" />;
}
