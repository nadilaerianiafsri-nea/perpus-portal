import { catalogProxy } from "@/catalog/proxy";
export async function GET(request: Request) {
  return catalogProxy(
    request,
    "grants",
    "Data hibah belum dapat dimuat. Silakan coba lagi.",
  );
}
