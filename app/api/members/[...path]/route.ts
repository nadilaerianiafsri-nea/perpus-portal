import { memberProxy } from "@/members/proxy";
async function handle(request: Request, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return memberProxy(request, path.join("/"));
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
