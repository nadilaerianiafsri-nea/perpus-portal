import { Suspense } from "react";
import AdminEBooksPage from "@/admin/AdminEBooksPage";

export default function EBookPage() {
  return (
    <Suspense fallback={<p role="status">Memuat E-Book...</p>}>
      <AdminEBooksPage />
    </Suspense>
  );
}
