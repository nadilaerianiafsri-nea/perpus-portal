# Audit tombol Kembali Admin dan Anggota

Standarisasi visual tombol/link navigasi Kembali existing pada 21 Oktober 2026. Tidak menambah tujuan navigasi, tombol baru, handler atau perubahan business logic.

## Shared variant

- `components/Button.tsx`: `ButtonVariant` mendukung `back`, termasuk untuk `ButtonLink`.
- `components/buttons.css`: satu sumber style `[data-button="back"]` memakai token website.
- Default: background/border `#000633`, teks dan icon putih.
- Hover/pressed: background/border `#FFD000`, teks dan icon `#000633`; pressed memakai pergeseran 1px existing.
- Tinggi 44px, padding horizontal 20px, gap 8px, Outfit 14px/600, radius dan icon 18px dari button system existing.
- Focus ring, disabled semantics, transition 160ms, dan prefers-reduced-motion tetap memakai sistem shared. Tidak ada `!important` atau CSS per halaman baru.

## Halaman yang memakai perubahan

| Role | Halaman/state | Tujuan existing, tetap |
| --- | --- | --- |
| Admin | Detail Buku | `/admin/koleksi/data-buku` |
| Admin | Edit Buku | Detail Buku yang sama |
| Admin | Tambah Buku | `/admin/koleksi/data-buku` |
| Admin | Detail E-Book | `/admin/koleksi/e-book` |
| Admin | Edit E-Book | Detail E-Book yang sama |
| Admin | Tambah E-Book | `/admin/koleksi/e-book` |
| Admin | Detail Hibah dan fallback error | `/admin/hibah-buku` |
| Admin | Edit Hibah | Detail Hibah yang sama |
| Admin | Tambah Hibah | `/admin/hibah-buku` |
| Admin | Detail Anggota, fallback tidak ditemukan/error | `/admin/keanggotaan` |
| Anggota | Detail koleksi fisik | `/dashboard/koleksi` |
| Anggota | Detail E-Book | `/dashboard/koleksi` |
| Anggota | Detail koleksi unavailable/not-found | `/dashboard/koleksi` |
| Anggota | State reader: akses/berkas tidak tersedia | Detail koleksi E-Book yang sama |
| Anggota | Tombol kembali reader aktif | `/dashboard/e-book`, setelah proses flush existing berhasil |

## Hasil audit dan pengecualian

- Detail Anggota pada kondisi normal hanya memiliki Edit dan Aktifkan/Nonaktifkan; tidak dibuat tombol Kembali baru. Yang distandarkan adalah tombol Kembali existing pada fallback error.
- Edit Anggota hanya mempunyai breadcrumb dan Batal. Batal tetap memakai variant existing; tidak dianggap tombol Kembali meskipun href menuju parent. Tambah Anggota tidak tersedia sebagai halaman admin existing.
- Tidak tersedia halaman Detail Transaksi terpisah yang mempunyai tombol Kembali. Reservasi/Peminjaman/Pengembalian/Buku Hilang/Sirkulasi existing adalah halaman list/monitoring.
- Profil Anggota dan pengaturan memakai form inline, tanpa tombol Kembali existing. Breadcrumb dan sidebar tetap.
- Reader mempertahankan kontrol icon-only square dan aria-label existing agar tidak mengubah susunan pembaca; variant sama dan ukuran diselaraskan menjadi 44px. Handler flush, loading dan disabled tetap.
- Shared layout detail katalog menggunakan variant `back` hanya ketika `member=true`. Detail public dan fallback public tetap `ghost`.
- Login/landing, pagination "Kembali ke Halaman Pertama", filter "Kembali ke Bulan Ini", kontrol halaman PDF dan aksi "Kembalikan E-Book" bukan back navigation role Admin/Anggota pada Detail/Edit/Tambah; tidak diubah.

## Verifikasi

- Baseline browser pada Detail Buku mereproduksi background transparan/teks primary dan tinggi 42px; pemeriksaan target navy gagal sebelum perubahan.
- Browser produksi terpisah dengan fixture in-memory: 51 kasus (17 halaman/state × 1440/768/390) lolos. Default/hover/icon/typography/tinggi/focus/overflow diperiksa; Enter membuka tujuan existing, termasuk form kosong tanpa memicu submit.
- State disabled reader tetap tidak menjadi kuning ketika di-hover. Reader kembali sesudah flush existing berhasil.
- Enam pemeriksaan public (detail fisik dan E-Book × tiga ukuran) memastikan variant tetap ghost.
- Tidak ada error JavaScript pada pengujian browser. Tidak ada overflow tombol atau halaman pada kasus yang diperiksa.
- Pemeriksaan AST 14 TSX memastikan perubahan hanya pada appearance, enum variant dan ukuran reader: seluruh route, handler, icon, key, kondisi disabled/loading, form logic dan Batal tetap. CSS seluruh variant lain identik.
- `npx.cmd tsc --noEmit`, ESLint seluruh TSX perubahan, 7 pengujian Button/ConfirmDialog, `npm.cmd run build` dan `git diff --check` lolos.
- Review terpisah tidak menemukan masalah material. Pengujian tidak mengakses database atau mengirim pesan sungguhan.

## File yang diubah

- `components/Button.tsx`
- `components/buttons.css`
- `admin/AdminBookDetail.tsx`
- `admin/AdminBookForm.tsx`
- `admin/AdminEBookDetail.tsx`
- `admin/AdminEBookForm.tsx`
- `admin/AdminGrantDetail.tsx`
- `admin/AdminGrantForm.tsx`
- `admin/AdminMemberDetail.tsx`
- `catalog/BookDetail.tsx`
- `catalog/BookDetailLayout.tsx`
- `catalog/EBookDetailLayout.tsx`
- `catalog/EBookReader.tsx`
- `app/dashboard/koleksi/[id]/not-found.tsx`
- `app/e-book/[id]/baca/page.tsx`
- `docs/back-button-audit.md`
