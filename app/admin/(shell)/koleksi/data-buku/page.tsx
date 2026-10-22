import { Suspense } from "react";
import AdminBooksPage from "@/admin/AdminBooksPage";

export default function DataBukuPage() {
  return (
    <Suspense fallback={<p role="status">Memuat Data Buku...</p>}>
      <AdminBooksPage />
    </Suspense>
  );
}
