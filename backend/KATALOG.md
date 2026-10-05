# Katalog Koleksi dan E-Book

Modul publik read-only menggunakan database `perpus_db`. Peminjaman, reservasi dan CRUD admin belum diimplementasikan pada modul ini.

## Menjalankan

Di folder `backend`:

```powershell
npx.cmd prisma generate --config prisma7.config.ts
npx.cmd prisma migrate deploy --config prisma7.config.ts
npm.cmd run build
node prisma/seed-catalog.cjs
npm.cmd run start:dev
```

Seed hanya untuk development dan menambah 20 koleksi contoh: 12 FISIK, 8 EBOOK. Kode berawalan `DEMO-` memastikan seed idempoten. Seed tidak menimpa koleksi yang sudah ada, tidak menghapus akun, dan tidak menjalankan seed auth. Cover memakai empat SVG yang sudah tersedia. Bacaan HTML contoh dapat dibaca di web, tetapi bukan isi publikasi resmi. Model juga menerima URL berkas PDF lokal untuk viewer.

Frontend memakai `API_URL` existing (default `http://127.0.0.1:3001`). Tidak diperlukan secret atau credential tambahan.

## Database

Migration `20261005000300_catalog` menambah `books` dan `book_copies`. Model Prisma: `Book`, `BookCopy`; enum: `CollectionType`, `CopyStatus`. Tabel auth tidak diubah. Kode buku dan kode eksemplar unik; hubungan buku-eksemplar memakai foreign key RESTRICT.

Status fisik dihitung dari eksemplar: TERSEDIA jika ada eksemplar tersedia; DIRESERVASI jika tidak ada yang tersedia tetapi ada yang direservasi; STOK_HABIS jika keduanya tidak ada. E-Book tidak memiliki status stok fisik.

## API

- `GET /collections`: daftar semua jenis.
- `GET /ebooks`: selalu hanya EBOOK, walaupun query mengirim FISIK.
- `GET /collections/filters`: kategori, bahasa dan tahun dari database.
- `GET /collections/:id`: metadata lengkap dan eksemplar.

Proxy frontend: `/api/collections`, `/api/collections/filters`, `/api/collections/:id`, `/api/ebooks`.

Parameter daftar: `search`, `type`, `availability`, `subject`, `language`, `yearFrom`, `yearTo`, `sort`, `page`, `limit`. Multi-filter menggunakan nilai dipisahkan koma. OR berlaku dalam kelompok filter, AND antar kelompok. Nilai jenis: FISIK/EBOOK; status: TERSEDIA/DIRESERVASI/STOK_HABIS. Tahun harus berurutan, halaman mulai 1, limit 1–40. Default limit koleksi 20, e-book 8. Query E-Book mengabaikan filter stok fisik.

Sort: `relevance`, `newest`, `titleAsc`, `titleDesc`, `yearDesc`, `yearAsc`. Relevansi mengutamakan judul persis, kode/ISBN persis, awalan judul, judul mengandung kata, kemudian penulis/subjek. Pencarian, kombinasi filter, pengurutan dan LIMIT/OFFSET dikerjakan di MySQL melalui Prisma dengan parameter terikat. Respons: `{ data, meta: { page, limit, total, totalPages } }`.

## Frontend

Route: `/koleksi`, `/e-book`, `/koleksi/[id]`, `/e-book/[id]/baca`. Komponen `catalog/` memakai navbar/footer existing. State query, sort, filter, jumlah per halaman, grid/list dan halaman disimpan di URL. Pencarian debounce 350 ms; permintaan sebelumnya dibatalkan saat query berubah. Pergantian grid/list tidak meminta ulang data.

Mobile menggunakan dialog native untuk filter; mendukung Escape, fokus dan checkbox asli. Detail fisik hanya menampilkan action persiapan peminjaman. Viewer hanya mengizinkan dokumen lokal di `/ebooks/` atau `/files/` dengan ekstensi HTML/PDF, memakai iframe sandbox. Tidak ada download sebagai CTA utama.

## Pemeriksaan

TypeScript frontend/backend diperiksa terpisah. Smoke check API menguji pencarian lima field, jenis, ketersediaan, kategori, bahasa, tahun, kombinasi, enam sort, pagination, detail dan hasil kosong. Browser diperiksa pada 1440px dan 390px, termasuk grid/list, ukuran halaman, filter dialog, pagination, bersihkan, viewer, loading/error dan navigasi URL. Tes auth existing dijalankan kembali. Tidak dibuat test suite besar baru.
