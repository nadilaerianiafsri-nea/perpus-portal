import {
  assertSameOrigin,
  readLimitedBytes,
  requestErrorResponse,
} from '@/shared/requestSecurity.cjs';
import 'server-only';
import { NextResponse } from 'next/server';
import { API_URL } from '@/catalog/serverApi';

const maxProxyBytes = 51 * 1024 * 1024;

export async function adminEBookUploadProxy(request: Request) {
  const responseHeaders = {
    'Cache-Control': 'no-store, private',
    'Content-Type': 'application/json',
  };

  if (request.method !== 'POST') {
    return NextResponse.json(
      { message: 'Endpoint tidak tersedia.' },
      { status: 405, headers: responseHeaders },
    );
  }

  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json(
      { message: 'Permintaan tidak diizinkan.' },
      { status: 403, headers: responseHeaders },
    );
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
    return NextResponse.json(
      { message: 'Format upload tidak valid.' },
      { status: 400, headers: responseHeaders },
    );
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxProxyBytes) {
    return NextResponse.json(
      { message: 'Ukuran file E-Book maksimal 50 MB.' },
      { status: 400, headers: responseHeaders },
    );
  }

  try {
    assertSameOrigin(request);
    const body = await readLimitedBytes(request, maxProxyBytes);
    if (body.byteLength > maxProxyBytes) {
      return NextResponse.json(
        { message: 'Ukuran file E-Book maksimal 50 MB.' },
        { status: 400, headers: responseHeaders },
      );
    }

    const cookie =
      request.headers
        .get('cookie')
        ?.split(';')
        .find((part) => part.trim().startsWith('perpus_session='))
        ?.trim() ?? '';

    const response = await fetch(`${API_URL}/admin/uploads/ebook`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Cookie: cookie,
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(60000),
    });

    if (response.status >= 500) throw new Error('Backend unavailable');

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const rejected = requestErrorResponse(error);
    if (rejected) return rejected;
    return NextResponse.json(
      {
        message:
          'Layanan upload E-Book belum dapat dihubungi. Silakan coba lagi.',
      },
      { status: 503, headers: responseHeaders },
    );
  }
}
