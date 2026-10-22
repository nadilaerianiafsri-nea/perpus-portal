import { notFound } from "next/navigation";
import LoanDetail from "@/members/LoanDetail";
import { parseLoanDetailId } from "@/admin/adminLoanDetails";

export default async function MemberLoanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: rawId } = await params;
  const id = parseLoanDetailId(rawId);
  if (id === null) notFound();
  return <LoanDetail key={id} id={id} />;
}
