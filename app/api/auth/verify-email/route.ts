import { proxyAuth } from '@/auth/proxyAuth';
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  if (query.getAll('token').length !== 1 || [...query.keys()].some(key => key !== 'token')) return Response.json({ message: 'Parameter verifikasi tidak valid.' }, { status: 400 });
  return proxyAuth(request, `verify-email?token=${encodeURIComponent(query.get('token') ?? '')}`);
}
