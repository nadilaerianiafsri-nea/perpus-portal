import { catalogProxy } from "@/catalog/proxy";
export async function GET(request: Request) {
  return catalogProxy(request, "ebooks");
}
