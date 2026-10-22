import AdminMemberForm from "@/admin/AdminMemberForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditAnggotaPage({ params }: Props) {
  const { id } = await params;

  return <AdminMemberForm id={id} />;
}
