# Audit card statistik global

Sistem card statistik public, anggota, dan admin menggunakan
`components/StatCard.tsx` serta `StatCard.module.css`. `AdminStatCard` tetap menjadi
adapter existing dengan props, tautan, label aksesibel, dan `data-admin-stat`
yang sama.

Card standar memiliki chip ikon 36px di kiri, label 11px, angka 28–30px,
padding 16–18px, radius 16px, dan tinggi minimal 110px. Metrik di dalam profil
memakai varian compact 76px dengan chip 30px. Semua foreground putih; detail
memakai putih 82%. Hanya card dengan tautan yang memiliki hover dan focus.

Token `--stat-*` di `app/globals.css` menggunakan navy, slate, dan teal existing.
Info, success, warning, danger, coral, dan yellow dicampur dengan navy melalui
`color-mix(in srgb, ...)`. Background tetap solid. Token warna grafik tidak diubah.

## Cakupan

| Area | Card yang diperbarui |
| --- | --- |
| Public | Landing: 3; Hibah Buku: 3 |
| Anggota | Ringkasan: 4; Pinjaman Saya: 3; E-Book Saya: 3; metrik profil kanan: 3 |
| Admin | Dashboard: 10; Buku: 3; E-Book: 3; Keanggotaan: 4; detail anggota: 4; Hibah: 4; detail hibah: 2; Reservasi: 4; Peminjaman: 4; Pengembalian: 4; Buku Hilang: 3; Sirkulasi E-Book: 3; Laporan: 8; stok detail buku: 1 |

Total: **76 metrik** pada komponen aktif. Metrik profil digunakan ulang pada
halaman anggota yang menampilkan panel kanan.

Card buku, berita, artikel, layanan, panduan, modal, form, tabel, dan panel grafik
dipertahankan. Angka urutan panduan, countdown reservasi, antrean, progress baca,
badge jumlah, dan stok sebagai metadata katalog bukan KPI mandiri. Halaman
Reservasi/Riwayat/Notifikasi/Profil/katalog anggota dan halaman admin lainnya
sudah diaudit; tidak ditambahkan statistik baru.

`admin/dminGrantsPage.tsx` merupakan duplikat lama tanpa pemakai. Route hibah aktif
memakai `AdminGrantsPage`, sehingga file lama tersebut tidak diubah.

## File

- Baru: `components/StatCard.tsx`, `components/StatCard.module.css`,
  `components/StatCard.test.mjs`, dan dokumen audit ini.
- Adapter admin: `admin/AdminStatCard.tsx`; CSS lama
  `admin/AdminStatCard.module.css` dihapus setelah dipusatkan ke shared component.
- Public: `app/page.tsx`, `app/globals.css`, `information/Grants.tsx`,
  `information/Information.module.css`.
- Anggota: `members/SummaryPage.tsx`, `members/LoansPage.tsx`,
  `members/EBooksPage.tsx`, `members/MemberRightPanel.tsx`,
  `members/Members.module.css`, `members/Loans.module.css`,
  `members/EBooks.module.css`.
- Admin: `admin/AdminBookDetail.tsx`, `admin/AdminBooks.module.css`,
  `admin/AdminMembers.module.css`, `admin/AdminReports.module.css`.

CSS card lama dibuang; CSS grid tetap berada di masing-masing halaman. Grid
statistik pada lebar sempit diperbaiki agar chip dan label horizontal tetap rapi,
termasuk judul buku populer di Laporan.

## Verifikasi

- Build produksi, TypeScript, lint seluruh file TSX/test yang diubah: lolos.
- 18 test terkait: shared StatCard, Dashboard/PeriodSelector, grafik, helper waktu.
- Browser produksi: 20 tampilan × 1440/768/390; ditambah desktop
  901/1024/1180/1280/1366 dan Ringkasan anggota pada 1366. Total 86 skenario lolos.
- Semua card diperiksa untuk white foreground, icon/title/value alignment,
  ukuran chip, tinggi proporsional/seragam dalam grid, serta tanpa overflow.
- Kontras foreground utama minimum **6,02:1**; detail minimum 4,5:1.
- Hover, focus keyboard, navigasi Enter, tujuan tautan, card statis, dan
  PeriodSelector existing diperiksa pada tiga ukuran utama.
- Browser menggunakan fixture in-memory terisolasi yang menolak non-GET, tanpa
  database/SMTP. Nilai contoh hanya untuk pengujian, tidak dimasukkan ke source UI.
- Pemeriksaan AST terhadap HEAD memastikan hooks/state/request API existing tetap
  sama. Tidak ada perubahan backend, schema, API route, kalkulasi atau auth.

Artefak screenshot dan hasil browser tersimpan lokal di `backend/.tmp/stat-*`
(diabaikan Git).
