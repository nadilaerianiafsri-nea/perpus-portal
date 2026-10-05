export type CollectionType = "FISIK" | "EBOOK";
export type Availability = "TERSEDIA" | "DIRESERVASI" | "STOK_HABIS";
export type Book = {
  id: number;
  code: string;
  title: string;
  author: string;
  year: number;
  type: CollectionType;
  coverUrl: string;
  subject: string;
  language: string;
  isDemo: boolean;
  totalCopies: number;
  availableCopies: number;
  availability: Availability | null;
};
export type BookDetail = Book & {
  isbnIssn: string | null;
  publisher: string;
  edition: string | null;
  format: string;
  description: string;
  shelf: string | null;
  ebookUrl: string | null;
  copies: { id: number; code: string; status: string; location: string }[];
};
export type CatalogResponse = {
  data: Book[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
export type FilterOptions = {
  subjects: string[];
  languages: string[];
  years: number[];
};
export const availabilityLabels = {
  TERSEDIA: "Tersedia",
  DIRESERVASI: "Direservasi",
  STOK_HABIS: "Stok Habis",
};
export const typeLabels = { FISIK: "Fisik", EBOOK: "E-Book" };
