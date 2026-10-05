import { Suspense } from "react";
import Catalog from "@/catalog/Catalog";
import CatalogShell from "@/catalog/CatalogShell";
export const metadata = {
  title: "Katalog E-Book | Perpustakaan Kemenkum Riau",
};
export default function Page() {
  return (
    <CatalogShell ebook>
      <Suspense fallback={<p role="status">Memuat katalog...</p>}>
        <Catalog ebook />
      </Suspense>
    </CatalogShell>
  );
}
