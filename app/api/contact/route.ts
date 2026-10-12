import { assertSameOrigin, readLimitedText, requestErrorResponse } from '@/shared/requestSecurity.cjs';
import { NextResponse } from "next/server";
import { API_URL } from "@/catalog/serverApi";

export async function POST(request: Request) {
  let body: unknown;
  try { assertSameOrigin(request); body = JSON.parse(await readLimitedText(request)); }
  catch (error) { const rejected = requestErrorResponse(error); if (rejected) return rejected; return NextResponse.json({ message: "Data pesan tidak valid." }, { status: 400 }); }
  try {
    const response = await fetch(`${API_URL}/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(25000),
    });
    const payload = await response.json();
    return NextResponse.json(payload, {
      status: response.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({
      code: "CONTACT_UNAVAILABLE",
      message: "Layanan pesan belum dapat dihubungi. Silakan coba lagi.",
    }, { status: 503 });
  }
}
