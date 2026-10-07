import 'server-only';
import { NextResponse } from 'next/server';
import { API_URL } from '@/catalog/serverApi';

const maxProxyBytes = 6 * 1024 * 1024;

export async function adminCoverUploadProxy(request: Request) {
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
      { message: 'Ukuran cover maksimal 5 MB.' },
      { status: 400, headers: responseHeaders },
    );
  }

  try {
    const body = await request.arrayBuffer();
    if (body.byteLength > maxProxyBytes) {
      return NextResponse.json(
        { message: 'Ukuran cover maksimal 5 MB.' },
        { status: 400, headers: responseHeaders },
      );
    }

    const cookie =
      request.headers
        .get('cookie')
        ?.split(';')
        .find((part) => part.trim().startsWith('perpus_session='))
        ?.trim() ?? '';

    const response = await fetch(`${API_URL}/admin/uploads/cover`, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        Cookie: cookie,
      },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });

    if (response.status >= 500) throw new Error('Backend unavailable');

    return new NextResponse(await response.text(), {
      status: response.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { message: 'Layanan upload cover belum dapat dihubungi. Silakan coba lagi.' },
      { status: 503, headers: responseHeaders },
    );
  }
}
