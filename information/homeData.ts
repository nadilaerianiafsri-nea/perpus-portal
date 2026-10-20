import "server-only";

import { API_URL } from "@/catalog/serverApi";
import type { Book, CatalogResponse, FilterOptions } from "@/catalog/types";
import type { BookGrant, GrantsResponse } from "./grantTypes";

export type HomeData = {
  latestBooks: Book[];
  subjects: string[];
  latestGrants: BookGrant[];
  stats: {
    physicalTitles: number | null;
    ebooks: number | null;
  };
};

async function json<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(9000),
  });
  if (!response.ok) throw new Error(`Public data unavailable: ${path}`);
  return response.json() as Promise<T>;
}

export async function getHomeData(): Promise<HomeData> {
  const [latest, summary, filters, grants] = await Promise.allSettled([
    json<CatalogResponse>("/collections?limit=6&sort=newest&type=FISIK"),
    json<{ physicalTitles: number; ebooks: number }>("/members/public/summary"),
    json<FilterOptions>("/collections/filters"),
    json<GrantsResponse>("/grants?limit=3&page=1"),
  ]);

  return {
    latestBooks: latest.status === "fulfilled" ? latest.value.data : [],
    subjects:
      filters.status === "fulfilled" ? filters.value.subjects.slice(0, 8) : [],
    latestGrants: grants.status === "fulfilled" ? grants.value.data : [],
    stats: {
      physicalTitles:
        summary.status === "fulfilled" ? summary.value.physicalTitles : null,
      ebooks: summary.status === "fulfilled" ? summary.value.ebooks : null,
    },
  };
}
