import { NextResponse } from "next/server";

import { API_URL } from "@/catalog/serverApi";

const allowed: Record<string, RegExp> = {
  GET: /^(?:me\/(dashboard|profile|reservations|loans(?:\/history)?|notifications|ebooks)|admin\/members(?:\/\d+)?|admin\/transactions\/(reservations|loans|returns|lost-books))$/,

  POST: /^(?:me\/(reservations|loans\/\d+\/extend|ebooks(?:\/\d+\/open)?)|admin\/(?:reservations\/\d+\/pickup|loans\/\d+\/(?:return|lost)))$/,

  PATCH:
    /^(?:me\/(profile|reservations\/\d+\/cancel|notifications\/(read-all|\d+\/read)|ebooks\/\d+\/progress)|admin\/members\/\d+(?:\/status)?)$/,
};

export async function memberProxy(request: Request, path: string) {
  const headers = {
    "Cache-Control": "no-store, private",
    "Content-Type": "application/json",
  };

  if (!allowed[request.method]?.test(path)) {
    return NextResponse.json(
      {
        message: "Endpoint tidak tersedia.",
      },
      {
        status: 404,
        headers,
      },
    );
  }

  if (request.method !== "GET") {
    const origin = request.headers.get("origin");

    if (origin && origin !== new URL(request.url).origin) {
      return NextResponse.json(
        {
          message: "Permintaan tidak diizinkan.",
        },
        {
          status: 403,
          headers,
        },
      );
    }
  }

  try {
    const body = request.method !== "GET" ? await request.text() : undefined;

    if (body && body.length > 16384) {
      return NextResponse.json(
        {
          message: "Data permintaan terlalu panjang.",
        },
        {
          status: 400,
          headers,
        },
      );
    }

    const cookie =
      request.headers
        .get("cookie")
        ?.split(";")
        .find((part) => part.trim().startsWith("perpus_session="))
        ?.trim() ?? "";

    const incomingUrl = new URL(request.url);

    const targetUrl = new URL(`${API_URL}/members/${path}`);

    incomingUrl.searchParams.forEach((value, key) => {
      targetUrl.searchParams.append(key, value);
    });

    const response = await fetch(targetUrl, {
      method: request.method,
      headers: {
        "Content-Type": "application/json",
        Cookie: cookie,
      },
      body: body || undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (response.status >= 500) {
      throw new Error("Backend unavailable");
    }

    return new NextResponse(await response.text(), {
      status: response.status,
      headers,
    });
  } catch {
    return NextResponse.json(
      {
        message: "Layanan anggota belum dapat dihubungi. Silakan coba lagi.",
      },
      {
        status: 503,
        headers,
      },
    );
  }
}
