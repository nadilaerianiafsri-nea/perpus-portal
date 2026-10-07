import { API_URL } from '@/catalog/serverApi';

type Context = { params: Promise<{ filename: string }> };

export async function GET(_request: Request, context: Context) {
  const { filename } = await context.params;

  if (!/^[0-9a-f-]+\.(?:jpg|png|webp)$/.test(filename)) {
    return new Response(null, { status: 404 });
  }

  try {
    const response = await fetch(
      `${API_URL}/uploads/covers/${encodeURIComponent(filename)}`,
      {
        cache: 'force-cache',
        signal: AbortSignal.timeout(10000),
      },
    );

    if (response.status === 404) return new Response(null, { status: 404 });
    if (!response.ok) throw new Error('Backend unavailable');

    const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
    const cacheControl =
      response.headers.get('cache-control') ?? 'public, max-age=31536000, immutable';

    return new Response(await response.arrayBuffer(), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
