import {
  assertSameOrigin,
  readLimitedText,
  requestErrorResponse,
} from '@/shared/requestSecurity.cjs';
import { NextResponse } from 'next/server';

import { API_URL } from '@/catalog/serverApi';

const allowed: Record<string, RegExp> = {
  GET: /^(?:me\/(dashboard|profile|reservations|loans(?:\/history)?|notifications|ebooks(?:\/\d+\/(?:status|file\.pdf))?|books\/\d+\/borrowing-status|catalog(?:\/filters|\/\d+)?)|admin\/members(?:\/\d+)?|admin\/transactions\/(reservations|loans|returns|lost-books)|admin\/operations\/(dashboard|notifications(?:\/unread-count)?|reports|settings))$/,

  POST: /^(?:me\/(reservations|loans\/\d+\/extend|ebooks(?:\/\d+\/(?:borrow|return|queue(?:\/cancel)?|open))?)|admin\/(?:reservations\/\d+\/pickup|loans\/\d+\/(?:return|lost)))$/,

  PATCH:
    /^(?:me\/(profile|reservations\/\d+\/cancel|notifications\/(read-all|\d+\/read)|ebooks\/\d+\/progress)|admin\/members\/\d+(?:\/status)?|admin\/operations\/(settings|notifications\/\d+\/read))$/,
};

export async function memberProxy(request: Request, path: string) {
  const headers = {
    'Cache-Control': 'no-store, private',
    'Content-Type': 'application/json',
  };

  if (!allowed[request.method]?.test(path)) {
    return NextResponse.json(
      { message: 'Endpoint tidak tersedia.' },
      { status: 404, headers },
    );
  }

  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json(
        { message: 'Permintaan tidak diizinkan.' },
        { status: 403, headers },
      );
    }
  }

  const isEBookFile =
    request.method === 'GET' && /^me\/ebooks\/\d+\/file\.pdf$/.test(path);

  try {
    assertSameOrigin(request);
    const body =
      request.method !== 'GET'
        ? await readLimitedText(request, 16384)
        : undefined;

    if (body && body.length > 16384) {
      return NextResponse.json(
        { message: 'Data permintaan terlalu panjang.' },
        { status: 400, headers },
      );
    }

    const cookie =
      request.headers
        .get('cookie')
        ?.split(';')
        .find((part) => part.trim().startsWith('perpus_session='))
        ?.trim() ?? '';

    const incomingUrl = new URL(request.url);
    const targetUrl = new URL(`${API_URL}/members/${path}`);

    incomingUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    const requestHeaders: Record<string, string> = { Cookie: cookie };
    if (!isEBookFile) requestHeaders['Content-Type'] = 'application/json';

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: requestHeaders,
      body: body || undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(isEBookFile ? 60000 : 15000),
    });

    if (response.status >= 500) {
      throw new Error('Backend unavailable');
    }

    if (isEBookFile && response.ok) {
      const fileHeaders = new Headers({
        'Cache-Control': 'private, no-store',
        'Content-Type': response.headers.get('content-type') ?? 'application/pdf',
        'X-Content-Type-Options': 'nosniff',
      });
      const contentLength = response.headers.get('content-length');
      const disposition = response.headers.get('content-disposition');
      if (contentLength) fileHeaders.set('Content-Length', contentLength);
      if (disposition) fileHeaders.set('Content-Disposition', disposition);

      return new NextResponse(response.body, {
        status: response.status,
        headers: fileHeaders,
      });
    }

    return new NextResponse(await response.text(), {
      status: response.status,
      headers,
    });
  } catch (error) {
    const rejected = requestErrorResponse(error);
    if (rejected) return rejected;
    return NextResponse.json(
      { message: 'Layanan anggota belum dapat dihubungi. Silakan coba lagi.' },
      { status: 503, headers },
    );
  }
}
