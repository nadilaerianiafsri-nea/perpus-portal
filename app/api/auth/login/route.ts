import { assertSameOrigin, readLimitedText, requestErrorResponse } from '@/shared/requestSecurity.cjs';
import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3001';

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await readLimitedText(request);

    const backendResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });

    const payload = await backendResponse.text();

    const response = new NextResponse(payload, {
      status: backendResponse.status,
      headers: {
        'Cache-Control': 'no-store',
        'Referrer-Policy': 'no-referrer',
        'Content-Type':
          backendResponse.headers.get('content-type') ?? 'application/json',
      },
    });

    const setCookie = backendResponse.headers.get('set-cookie');

    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }

    return response;
  } catch (error) {
    const rejected = requestErrorResponse(error);
    if (rejected) return rejected;
    return NextResponse.json(
      {
        message:
          'Backend tidak dapat dihubungi. Pastikan NestJS berjalan di port 3001.',
      },
      { status: 503 },
    );
  }
}
