import { adminEBooksProxy } from '@/admin/ebooksProxy';

type Context = { params: Promise<{ path: string[] }> };

async function handle(request: Request, context: Context) {
  const { path } = await context.params;
  return adminEBooksProxy(request, path.join('/'));
}

export const GET = handle;
export const PATCH = handle;
