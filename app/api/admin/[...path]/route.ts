import { adminBooksProxy } from "@/admin/booksProxy";

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: Context) {
  const { path } = await context.params;
  return adminBooksProxy(request, path.join("/"));
}

export const GET = handle;
export const PATCH = handle;
