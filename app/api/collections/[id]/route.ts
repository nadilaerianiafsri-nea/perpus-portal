import { catalogProxy } from "@/catalog/proxy";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^\d+$/.test(id))
    return Response.json(
      { message: "Koleksi tidak ditemukan." },
      { status: 404 },
    );
  return catalogProxy(request, `collections/${id}`);
}
