import { adminEBooksProxy } from '@/admin/ebooksProxy';

export async function GET(request: Request) {
  return adminEBooksProxy(request);
}

export async function POST(request: Request) {
  return adminEBooksProxy(request);
}
