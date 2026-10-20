# Granularitas grafik transaksi

Dashboard Admin dan Laporan Admin memakai `TransactionTrendChart` dan helper
`shared/chartTime.cjs` yang sama. Audit halaman Sirkulasi/Transaksi tidak menemukan
grafik time-series tambahan; donut Kategori Anggota tetap dipertahankan.

| Periode | Bucket |
| --- | --- |
| Hari Ini | 24 jam, 00:00–23:00 WIB |
| Minggu Ini / Bulan Ini | Harian, sampai hari ini |
| Rentang custom ≤62 hari | Harian |
| Rentang lebih panjang, sampai 24 bulan kalender | Bulanan |
| Lebih dari 24 bulan kalender | Tahunan, didukung helper |
| Satu tahun penuh | 12 bulan |

API dan PeriodSelector tetap membatasi rentang maksimal 366 hari seperti semula.
Tidak ada filter tahun untuk grafik existing yang perlu ditambahkan. Dukungan
tahunan pada helper tidak memperluas batas API tersebut.

Endpoint Dashboard/Laporan existing menerima parameter opsional `granularity`
(`hour`, `day`, `month`, `year`). Tanpa parameter ini, panjang rentang menentukan
granularitas. Frontend mengirim `hour` untuk preset Hari Ini agar berbeda dari
custom satu tanggal. Validasi menolak per-jam untuk beberapa hari dan per-hari
untuk rentang di atas 62 hari. Backend sebelumnya hanya mengelompokkan bulanan;
query Prisma, batas WIB, perhitungan KPI, dan aturan transaksi tetap sama.

Bucket kalender diisi lebih dahulu dengan 0. Timestamp transaksi dikelompokkan
berdasarkan WIB ke bucket yang sama untuk kedua series. Label Bahasa Indonesia,
tooltip per bucket, sumbu Y integer, dan penjarangan label sumbu X tidak mengubah
data. Periode tanpa transaksi menampilkan empty state existing.

Verifikasi read-only MySQL pada 20 Oktober 2026: periode 1–20 Oktober menghasilkan
20 bucket harian dengan total 2 peminjaman dan 1 pengembalian, sesuai hitungan
Prisma independen. Dashboard dan Laporan diuji di browser pada 1440/768/390:
preset, custom, zero fill, tooltip fokus/keyboard, refresh, dan tanpa overflow.
Pengujian browser memakai service Prisma aktual melalui preview API read-only;
tidak menulis data transaksi.

Test terkait: 14 test Node frontend/shared dan 30 test backend admin operations.

File pada tugas granularitas ini:

- `shared/chartTime.cjs`, `shared/chartTime.d.cts`, `shared/chartTime.test.cjs`
- `admin/TransactionTrendChart.tsx`, `admin/TransactionTrendChart.module.css`,
  `admin/TransactionTrendChart.test.mjs`
- `admin/AdminDashboard.tsx`, `admin/AdminDashboard.test.mjs`,
  `admin/AdminReportsPage.tsx`, `admin/adminOperations.ts`
- `admin/Admin.module.css`, `admin/AdminReports.module.css`
- `backend/src/members/admin-operations.controller.ts`,
  `backend/src/members/admin-operations.service.ts`,
  `backend/src/members/admin-operations.validation.ts`,
  `backend/src/members/admin-operations.spec.ts`
- `docs/chart-granularity.md`

TypeScript frontend/backend, lint tanpa error, dan build frontend/backend lolos.
Lint backend masih melaporkan dua warning existing pada parser notifikasi.
Suite backend penuh masih memiliki 90 test gagal pada modul lain di luar grafik;
30 test admin operations di atas tetap lolos. Tidak diperluas ke perbaikan auth,
security, atau sirkulasi e-book pada tugas ini.
