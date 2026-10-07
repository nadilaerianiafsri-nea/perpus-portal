import AdminBookForm from "@/admin/AdminBookForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditDataBukuPage({ params }: Props) {
  const { id } = await params;
  return <AdminBookForm mode="edit" id={id} />;
}
