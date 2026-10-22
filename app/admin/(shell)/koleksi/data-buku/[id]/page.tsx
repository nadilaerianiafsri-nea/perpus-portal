import AdminBookDetailPage from "@/admin/AdminBookDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DetailDataBukuPage({ params }: Props) {
  const { id } = await params;
  return <AdminBookDetailPage id={id} />;
}
