import AdminEBookForm from "@/admin/AdminEBookForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditEBookPage({ params }: Props) {
  const { id } = await params;
  return <AdminEBookForm mode="edit" id={id} />;
}
