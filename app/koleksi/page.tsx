import { Suspense } from "react";
import Catalog from "@/catalog/Catalog";
import CatalogShell from "@/catalog/CatalogShell";
export const metadata = {
  title: "Katalog Koleksi | Perpustakaan Kemenkum Riau",
};
export default function Page() {
  return (
    <CatalogShell>
      <Suspense fallback={<p role="status">Memuat katalog...</p>}>
        <Catalog />
      </Suspense>
    </CatalogShell>
  );
}
