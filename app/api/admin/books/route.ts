import { adminBooksProxy } from '@/admin/booksProxy';

export async function GET(request: Request) {
  return adminBooksProxy(request);
}

export async function POST(request: Request) {
  return adminBooksProxy(request);
}
