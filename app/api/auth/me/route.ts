import { proxyAuth } from '@/auth/proxyAuth';
export async function GET(request: Request) { return proxyAuth(request, 'me'); }
