import "server-only";
import { cookies } from "next/headers";
import type { Book, BookDetail, CatalogResponse } from "./types";

export const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";

export async function getRelatedBooks(
  book: Book,
): Promise<{ books: Book[]; unavailable: boolean }> {
  const query = new URLSearchParams({ limit: "8", sort: "relevance" });
  if (book.subject) query.set("subject", book.subject);
  try {
    // Recommendations share the public-safe catalogue for both shells.
    const response = await fetch(`${API_URL}/collections?${query}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return { books: [], unavailable: true };
    const data = (await response.json()) as CatalogResponse;
    return {
      books: data.data.filter((item) => item.id !== book.id).slice(0, 6),
      unavailable: false,
    };
  } catch {
    return { books: [], unavailable: true };
  }
}

export async function getBook(
  id: string,
  member = false,
): Promise<{ book: BookDetail | null; unavailable: boolean }> {
  if (!/^\d+$/.test(id)) return { book: null, unavailable: false };

  try {
    const headers: HeadersInit = {};
    let path = `collections/${encodeURIComponent(id)}`;

    if (member) {
      const token = (await cookies()).get("perpus_session")?.value;
      if (!token) return { book: null, unavailable: false };
      headers.Cookie = `perpus_session=${encodeURIComponent(token)}`;
      path = `members/me/catalog/${encodeURIComponent(id)}`;
    }

    const response = await fetch(`${API_URL}/${path}`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 404) return { book: null, unavailable: false };
    if (!response.ok) return { book: null, unavailable: true };
    return { book: await response.json(), unavailable: false };
  } catch {
    return { book: null, unavailable: true };
  }
}
