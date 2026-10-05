import BookDetail from "@/catalog/BookDetail";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <BookDetail id={(await params).id} />;
}
