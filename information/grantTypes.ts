export type GrantStatus =
  "MENUNGGU_VERIFIKASI" | "SEDANG_DIPROSES" | "SUDAH_DIKATALOGKAN";
export type BookGrant = {
  id: number;
  title: string;
  quantity: number;
  donorName: string;
  receivedAt: string;
  status: GrantStatus;
  isDemo: boolean;
};
export type GrantsResponse = {
  data: BookGrant[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  summary: {
    totalTitles: number;
    totalBooks: number;
    catalogued: number;
    demoRecords: number;
  };
  years: number[];
};
export const grantStatusLabels: Record<GrantStatus, string> = {
  MENUNGGU_VERIFIKASI: "Menunggu Verifikasi",
  SEDANG_DIPROSES: "Sedang Diproses",
  SUDAH_DIKATALOGKAN: "Sudah Dikatalogkan",
};
