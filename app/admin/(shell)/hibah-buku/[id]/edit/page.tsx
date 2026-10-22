import AdminGrantForm from "@/admin/AdminGrantForm";

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditHibahBukuPage({ params }: Props) {
  const { id } = await params;

  return <AdminGrantForm mode="edit" id={id} />;
}
