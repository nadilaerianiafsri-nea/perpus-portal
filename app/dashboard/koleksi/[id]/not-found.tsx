import NotFoundState from "@/components/NotFoundState";

export default function NotFound() {
  return <NotFoundState context="member" title="Koleksi Tidak Ditemukan"
    description="Koleksi yang Anda cari tidak tersedia. Silakan kembali ke katalog untuk menemukan koleksi lainnya."
    primaryHref="/dashboard/koleksi" primaryLabel="Kembali ke Katalog" />;
}
