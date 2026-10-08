import AdminMemberDetail from "@/admin/AdminMemberDetail";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function DetailAnggotaPage({ params }: Props) {
  const { id } = await params;

  return <AdminMemberDetail id={id} />;
}
