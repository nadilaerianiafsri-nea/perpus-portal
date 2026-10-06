# Informasi Hibah Buku dan Tentang Perpustakaan

Route publik: `/hibah-buku` dan `/tentang`. Keduanya memakai navbar/footer existing dan state current user dari cookie auth. Tentang hanya memakai konten statis berlabel Data Contoh; tidak membutuhkan tabel atau API tambahan.

## Database dan seed hibah

Model Prisma `BookGrant`, enum `GrantStatus`, tabel `book_grants`. Migration `20261006000100_book_grants` hanya menambah tabel ini. Tabel pengguna, profil, koleksi dan eksemplar tidak diubah.

Jalankan dari folder `backend`:

```powershell
npx.cmd prisma generate --config prisma7.config.ts
npx.cmd prisma migrate deploy --config prisma7.config.ts
npm.cmd run build
node prisma/seed-grants.cjs
npm.cmd run start:dev
```

Seed hanya untuk development, idempoten melalui `seedKey`, tidak menimpa data existing. Lima hibah mencakup semua status, dua tahun dan beberapa pemberi. Total contoh: 5 judul, 98 eksemplar, 3 sudah dikatalogkan. Record contoh ditandai `isDemo`; judul/nama pemberi seed juga menyertakan Data Contoh.

## API

`GET /grants` diproxy melalui `GET /api/grants`. Parameter:

- `search`: substring judul atau nama pemberi, maksimal 191 karakter.
- `status`: MENUNGGU_VERIFIKASI, SEDANG_DIPROSES, SUDAH_DIKATALOGKAN.
- `year`: tahun penerimaan.
- `page`: mulai 1.
- `limit`: default 10, maksimal 50.

Pencarian dan filter digabung dengan AND, dijalankan melalui Prisma/database. Urutan default tanggal penerimaan terbaru, lalu ID menurun untuk pagination yang stabil. Tanggal disimpan sebagai DATE dan diformat dengan lokal Indonesia serta zona UTC agar tanggal tidak bergeser.

Respons memuat `data`, `meta: { page, limit, total, totalPages }`, `summary: { totalTitles, totalBooks, catalogued, demoRecords }`, dan `years`. Statistik selalu mencakup seluruh record, terpisah dari hasil filter. Pilihan tahun berasal dari database.

Tidak ada endpoint penulisan, form donor, pengajuan hibah, atau upload proposal. Informasi publik ini hanya mencatat hibah yang telah diterima; status merujuk proses verifikasi/katalog internal.

## Frontend

Komponen utama `information/Grants.tsx`, `GrantBadge.tsx`, serta `Information.module.css`. Komponen pencarian debounce 350 ms dipakai bersama katalog melalui `components/SearchField.tsx`; breadcrumb melalui `PageBreadcrumb.tsx`. Search/status/tahun/halaman tersimpan di URL untuk refresh dan navigasi kembali. Permintaan lama dibatalkan saat query berubah. Desktop memakai tabel, mobile memakai kartu per hibah. Loading memakai skeleton; error memakai pesan ramah dan Coba Lagi; empty state menyediakan Bersihkan Filter ketika filter aktif.

Tentang menampilkan Koleksi Terkurasi, Layanan Anggota, Tanpa Denda, dan Visi Layanan sesuai referensi. Tidak ada informasi denda uang.

Tidak diperlukan environment tambahan. Frontend menggunakan `API_URL` existing; backend menggunakan `DATABASE_URL` existing. Halaman tidak mengirim email atau mengubah konfigurasi SMTP.
