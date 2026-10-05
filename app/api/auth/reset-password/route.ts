import { proxyAuth } from '@/auth/proxyAuth';
export async function POST(request: Request) { return proxyAuth(request, 'reset-password'); }
