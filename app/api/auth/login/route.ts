import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL ?? 'http://127.0.0.1:3001';

export async function POST(request: Request) {
  try {
    const body = await request.text();

    const backendResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      cache: 'no-store',
    });

    const payload = await backendResponse.text();

    const response = new NextResponse(payload, {
      status: backendResponse.status,
      headers: {
        'Content-Type':
          backendResponse.headers.get('content-type') ?? 'application/json',
      },
    });

    const setCookie = backendResponse.headers.get('set-cookie');

    if (setCookie) {
      response.headers.set('set-cookie', setCookie);
    }

    return response;
  } catch {
    return NextResponse.json(
      {
        message:
          'Backend tidak dapat dihubungi. Pastikan NestJS berjalan di port 3001.',
      },
      { status: 503 },
    );
  }
}
