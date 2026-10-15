import "server-only";
import { cookies } from "next/headers";
import type { Book, BookDetail, CatalogResponse } from "./types";

export const API_URL = process.env.API_URL ?? "http://127.0.0.1:3001";

export async function getRelatedBooks(
  book: Book,
): Promise<{ books: Book[]; unavailable: boolean }> {
  if (book.type === "EBOOK") {
    const queries = [
      new URLSearchParams({ limit: "8", sort: "yearDesc" }),
      ...(book.subject
        ? [
            new URLSearchParams({
              limit: "8",
              sort: "yearDesc",
              subject: book.subject,
            }),
          ]
        : []),
      ...(book.author
        ? [
            new URLSearchParams({
              limit: "8",
              sort: "relevance",
              search: book.author.slice(0, 191),
            }),
          ]
        : []),
    ];
    const sources = await Promise.allSettled(
      queries.map(async (query) => {
        const response = await fetch(`${API_URL}/ebooks?${query}`, {
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) throw new Error("Recommendations unavailable");
        return ((await response.json()) as CatalogResponse).data;
      }),
    );
    const candidates = new Map<number, Book>();
    for (const source of sources) {
      if (source.status !== "fulfilled") continue;
      for (const item of source.value) {
        if (item.type === "EBOOK" && item.id !== book.id)
          candidates.set(item.id, item);
      }
    }
    const same = (value: string, current: string) =>
      Boolean(current) &&
      value?.trim().toLowerCase() === current.trim().toLowerCase();
    return {
      books: [...candidates.values()]
        .sort(
          (a, b) =>
            Number(same(b.subject, book.subject)) -
              Number(same(a.subject, book.subject)) ||
            Number(same(b.author, book.author)) -
              Number(same(a.author, book.author)) ||
            Math.abs(a.year - book.year) - Math.abs(b.year - book.year) ||
            b.year - a.year ||
            a.id - b.id,
        )
        .slice(0, 5),
      unavailable: sources.every((source) => source.status === "rejected"),
    };
  }
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
