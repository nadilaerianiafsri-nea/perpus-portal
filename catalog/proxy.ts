import { NextResponse } from "next/server";
import { API_URL } from "./serverApi";
export async function catalogProxy(request: Request, path: string) {
  try {
    const query = new URL(request.url).search;
    const response = await fetch(`${API_URL}/${path}${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const payload = await response.text();
    if (response.status >= 500) throw new Error();
    return new NextResponse(payload, {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { message: "Data koleksi belum dapat dimuat. Silakan coba lagi." },
      { status: 503 },
    );
  }
}
