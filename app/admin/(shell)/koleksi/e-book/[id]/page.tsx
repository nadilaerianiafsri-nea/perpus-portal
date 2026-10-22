import AdminEBookDetailPage from "@/admin/AdminEBookDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DetailEBookPage({ params }: Props) {
  const { id } = await params;
  return <AdminEBookDetailPage id={id} />;
}
