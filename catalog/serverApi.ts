import "server-only";
import type { BookDetail } from "./types";
export const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";
export async function getBook(
  id: string,
): Promise<{ book: BookDetail | null; unavailable: boolean }> {
  if (!/^\d+$/.test(id)) return { book: null, unavailable: false };
  try {
    const response = await fetch(
      `${API_URL}/collections/${encodeURIComponent(id)}`,
      { cache: "no-store", signal: AbortSignal.timeout(10000) },
    );
    if (response.status === 404) return { book: null, unavailable: false };
    if (!response.ok) return { book: null, unavailable: true };
    return { book: await response.json(), unavailable: false };
  } catch {
    return { book: null, unavailable: true };
  }
}
