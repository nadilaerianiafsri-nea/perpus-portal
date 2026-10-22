import { Suspense } from "react";
import Catalog from "@/catalog/Catalog";

export const metadata = {
  title: "Koleksi Anggota | Perpustakaan Kemenkum Riau",
};

export default function Page() {
  return (
    <Suspense fallback={<p role="status">Memuat katalog...</p>}>
      <Catalog member />
    </Suspense>
  );
}
