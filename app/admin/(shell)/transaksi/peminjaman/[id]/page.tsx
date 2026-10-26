import { notFound } from "next/navigation";
import AdminLoanDetail from "@/admin/AdminLoanDetail";
import { loanDetailBackHref, parseLoanDetailId } from "@/admin/adminLoanDetails";

export default async function LoanDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ source?: string | string[] }> }) {
  const { id: rawId } = await params;
  const id = parseLoanDetailId(rawId);
  if (id === null) notFound();
  return <AdminLoanDetail id={id} kind="physical" backHref={loanDetailBackHref((await searchParams).source)} />;
}
