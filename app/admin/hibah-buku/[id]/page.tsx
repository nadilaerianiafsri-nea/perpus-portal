import AdminGrantDetail from "@/admin/AdminGrantDetail";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DetailHibahBukuPage({ params }: Props) {
  const { id } = await params;

  return <AdminGrantDetail id={id} />;
}
