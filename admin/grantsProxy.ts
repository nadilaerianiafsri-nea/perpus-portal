import "server-only";

import { NextResponse } from "next/server";

import { API_URL } from "@/catalog/serverApi";

const allowed: Record<string, RegExp> = {
  GET: /^(?:|\d+)$/,
  POST: /^$/,
  PATCH: /^\d+$/,
};

export async function adminGrantsProxy(request: Request, path = "") {
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
    const body = request.method === "GET" ? undefined : await request.text();

    if (body && body.length > 65536) {
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

    const query = request.method === "GET" ? new URL(request.url).search : "";

    const cookie =
      request.headers
        .get("cookie")
        ?.split(";")
        .find((part) => part.trim().startsWith("perpus_session="))
        ?.trim() ?? "";

    const response = await fetch(
      `${API_URL}/admin/grants${path ? `/${path}` : ""}${query}`,
      {
        method: request.method,
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: body || undefined,
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );

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
        message: "Layanan Hibah Buku belum dapat dihubungi. Silakan coba lagi.",
      },
      {
        status: 503,
        headers,
      },
    );
  }
}
