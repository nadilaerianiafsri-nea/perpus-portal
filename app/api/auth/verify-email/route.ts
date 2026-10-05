import { proxyAuth } from '@/auth/proxyAuth';
export async function GET(request: Request) { return proxyAuth(request, `verify-email?token=${encodeURIComponent(new URL(request.url).searchParams.get('token') ?? '')}`); }
