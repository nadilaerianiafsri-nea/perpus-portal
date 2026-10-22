import NotFoundState from "@/components/NotFoundState";

export default function NotFound() {
  return <NotFoundState title="Koleksi Tidak Ditemukan"
    description="Koleksi yang Anda cari tidak tersedia. Silakan kembali ke katalog untuk menemukan koleksi lainnya."
    primaryHref="/koleksi" primaryLabel="Kembali ke Koleksi" />;
}
