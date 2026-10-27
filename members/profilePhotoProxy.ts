import 'server-only';
import { API_URL } from '@/catalog/serverApi';
import { profilePhotoUrl } from '@/shared/memberAvatar.cjs';
import {
  assertSameOrigin,
  readLimitedBytes,
  readLimitedText,
  requestErrorResponse,
} from '@/shared/requestSecurity.cjs';

const maxMultipartBytes = 6 * 1024 * 1024;
const privateHeaders = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
};
const photoEndpoint = `${API_URL}/members/me/profile/photo`;

function jsonError(message: string, status: number) {
  return Response.json({ message }, { status, headers: privateHeaders });
}

function sessionCookie(request: Request) {
  const cookie = request.headers.get('cookie')?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('perpus_session='));
  return cookie && cookie.slice('perpus_session='.length).trim() ? cookie : null;
}

function proxyFailure(error: unknown) {
  const rejected = requestErrorResponse(error);
  if (rejected) {
    for (const [name, value] of Object.entries(privateHeaders)) rejected.headers.set(name, value);
    return rejected;
  }
  return jsonError('Layanan foto profil belum dapat dihubungi. Silakan coba lagi.', 503);
}

async function jsonBackendResponse(response: Response) {
  if (response.status >= 500) throw new Error('Backend unavailable');
  return new Response(await response.text(), {
    status: response.status,
    headers: { ...privateHeaders, 'Content-Type': 'application/json' },
  });
}

export async function memberProfilePhotoProxy(request: Request) {
  if (!['POST', 'DELETE'].includes(request.method)) return jsonError('Endpoint tidak tersedia.', 405);
  try {
    assertSameOrigin(request);
    const cookie = sessionCookie(request);
    if (!cookie) return jsonError('Silakan masuk terlebih dahulu.', 401);
    if (new URL(request.url).search) return jsonError('Parameter permintaan tidak valid.', 400);

    const headers: Record<string, string> = { Cookie: cookie };
    let body: Uint8Array<ArrayBuffer> | undefined;
    if (request.method === 'POST') {
      const contentType = request.headers.get('content-type') ?? '';
      if (!/^multipart\/form-data\s*;/i.test(contentType) || !/;\s*boundary=(?:"[^"\r\n]+"|[^;\s]+)(?:\s*;|\s*$)/i.test(contentType)) {
        return jsonError('Format upload tidak valid.', 400);
      }
      headers['Content-Type'] = contentType;
      body = await readLimitedBytes(request, maxMultipartBytes);
    } else {
      const text = (await readLimitedText(request, 1024)).trim();
      if (text) {
        let payload: unknown;
        try { payload = JSON.parse(text); } catch { return jsonError('Data permintaan tidak valid.', 400); }
        if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length) {
          return jsonError('Data permintaan tidak valid.', 400);
        }
      }
    }

    const response = await fetch(photoEndpoint, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    });
    return await jsonBackendResponse(response);
  } catch (error) {
    return proxyFailure(error);
  }
}

export async function memberProfilePhotoReadProxy(request: Request, filename: string) {
  if (request.method !== 'GET') return jsonError('Endpoint tidak tersedia.', 405);
  try {
    const cookie = sessionCookie(request);
    if (!cookie) return jsonError('Silakan masuk terlebih dahulu.', 401);
    if (new URL(request.url).search || !profilePhotoUrl(`/uploads/avatars/${filename}`)) {
      return jsonError('Referensi foto tidak valid.', 400);
    }
    const response = await fetch(`${photoEndpoint}/${filename}`, {
      method: 'GET',
      headers: { Cookie: cookie },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return await jsonBackendResponse(response);

    const extension = filename.slice(filename.lastIndexOf('.') + 1);
    const mimeByExtension: Record<string, string> = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    const expectedMime = mimeByExtension[extension];
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (!expectedMime || contentType !== expectedMime) {
      await response.body?.cancel();
      return jsonError('Format foto profil tidak valid.', 502);
    }
    return new Response(response.body, {
      status: response.status,
      headers: {
        ...privateHeaders,
        'Content-Type': expectedMime,
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return proxyFailure(error);
  }
}
