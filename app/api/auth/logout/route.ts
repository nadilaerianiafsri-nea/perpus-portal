import { NextResponse } from 'next/server';
import { assertSameOrigin, readLimitedText, requestErrorResponse } from '@/shared/requestSecurity.cjs';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3001';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readLimitedText(request);
    if (body.trim() && body.trim() !== '{}') return NextResponse.json({ message: 'Data permintaan tidak valid.' }, { status: 400 });
  } catch (error) { return requestErrorResponse(error) ?? NextResponse.json({ message: 'Data permintaan tidak valid.' }, { status: 400 }); }
  const cookie = request.headers.get('cookie') ?? '';

  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    // Cookie browser tetap dibersihkan walaupun backend sedang tidak aktif.
  }

  const response = NextResponse.json({ success: true });

  response.cookies.set('perpus_session', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(0),
  });

  return response;
}
