import { NextResponse } from 'next/server';
export async function proxyAuth(request: Request, path: string) {
  try {
    const method = request.method;
    const response = await fetch(`${process.env.API_URL ?? 'http://127.0.0.1:3001'}/auth/${path}`, {
      method, headers: { 'Content-Type': 'application/json', Cookie: request.headers.get('cookie') ?? '' },
      body: method === 'POST' ? await request.text() : undefined, cache: 'no-store', signal: AbortSignal.timeout(12000),
    });
    return new NextResponse(await response.text(), { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
  } catch { return NextResponse.json({ message: 'Server tidak dapat dihubungi. Silakan coba lagi.' }, { status: 503 }); }
}
