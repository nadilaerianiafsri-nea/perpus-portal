import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3001';

export async function POST(request: Request) {
  const cookie = request.headers.get('cookie') ?? '';

  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookie },
      cache: 'no-store',
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
