import { adminGrantsProxy } from "@/admin/grantsProxy";

type Context = {
  params: Promise<{
    path: string[];
  }>;
};

async function handle(request: Request, context: Context) {
  const { path } = await context.params;

  return adminGrantsProxy(request, path.join("/"));
}

export const GET = handle;
export const PATCH = handle;
