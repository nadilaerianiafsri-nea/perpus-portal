# Informasi operasional Dashboard Admin

Dua section baru ditempatkan setelah Transaksi Peminjaman dan Kategori Anggota:
Koleksi Paling Sering Dipinjam serta Memerlukan Tindakan. Panel putih, bar navy,
dan tint semantik memakai token website existing. Desktop memakai proporsi 40/60;
tablet/mobile ditumpuk tanpa horizontal overflow.

## Sumber data

Endpoint existing `GET /members/admin/operations/dashboard` diperluas, tetap
melalui proxy `/api/members/admin/operations/dashboard`. Response awal yang sama
memuat kedua section; tidak ada request awal tambahan.

- `topBorrowedCollections`: maksimum lima buku fisik non-demo dari seluruh
  riwayat `Loan` dengan reservasi `DIAMBIL`. Database mengelompokkan `bookId`,
  mengurutkan jumlah menurun lalu ID menaik untuk tie-break, dan membatasi lima.
  Judul diambil dalam satu query batch. Reservasi yang belum diambil/dibatalkan
  tidak dihitung. Riwayat buku nonaktif tetap valid karena detail admin tersedia.
- `actionRequired.expiringReservations`: reservasi anggota menunggu pengambilan
  dengan `now < expiresAt <= now + 2 jam`. Ini mengikuti aturan hampir kedaluwarsa
  existing, tanpa mengubah durasi expiry reservasi.
- `overdueLoans`: pinjaman fisik anggota berstatus `AKTIF`, `returnedAt = null`,
  dan `dueAt < now`.
- `pendingLostBookReplacements`: pinjaman fisik anggota berstatus `HILANG` dan
  belum dikembalikan. Ini merepresentasikan workflow buku hilang existing;
  project belum memiliki entitas/status verifikasi penggantian tersendiri.
  Label UI adalah “buku hilang perlu ditangani”.
- `failedNotifications`: jumlah record dengan `emailDelivery = FAILED`.
  Pengiriman email menyimpan kegagalan yang nyata. WhatsApp existing bersifat
  manual; kategori WhatsApp gagal tidak dibuat.

Ranking sepanjang waktu dan tindakan live tidak mengikuti filter periode grafik.
KPI, donut, granularity dan behavior PeriodSelector tetap dipertahankan.

## Navigasi

| Item | Tujuan existing |
| --- | --- |
| Koleksi | `/admin/koleksi/data-buku/{id}` |
| Reservasi | `/admin/transaksi/reservasi?status=MENUNGGU_PENGAMBILAN` |
| Terlambat | `/admin/transaksi/peminjaman?status=OVERDUE` |
| Buku hilang | `/admin/transaksi/buku-hilang-penggantian?status=PROCESS` |
| Email gagal | `/admin/notifikasi` |

Halaman Reservasi belum memiliki URL filter khusus sisa dua jam; tujuan memakai
status menunggu yang didukung. Halaman Notifikasi belum memiliki filter gagal
melalui URL, sehingga tidak dibuat query parameter baru. Bar dan action row
seluruhnya merupakan native Link, dengan hover/focus, navigasi Enter, dan label
aksesibel. Judul panjang memakai ellipsis serta tooltip judul lengkap.

## Loading dan kegagalan

Setiap panel memiliki skeleton, error/retry, serta empty state. Kategori dengan
count 0 tidak ditampilkan. Jika satu agregasi tambahan gagal, backend mengirim
`null` hanya untuk panel tersebut; hasil KPI/grafik dan panel lainnya tetap ada.
Retry memakai endpoint yang sama dan hanya memperbarui panel yang dipilih,
tanpa mengganti KPI, donut, ataupun periode grafik.

## File

- `admin/AdminDashboard.tsx`
- `admin/AdminDashboardInsights.tsx`
- `admin/AdminDashboardInsights.module.css`
- `admin/dashboardInsights.ts`
- `admin/AdminDashboardInsights.test.mjs`
- `backend/src/members/admin-operations.service.ts`
- `backend/src/members/admin-operations.spec.ts`
- Dokumen ini.

## Verifikasi

- 24 test frontend/shared dan 39 test backend admin operations: lolos.
- TypeScript frontend/backend, lint file perubahan, build frontend/backend: lolos.
- Pembandingan SELECT SQL independen terhadap hasil service Prisma pada database
  aktual: cocok. Saat diuji, satu koleksi memiliki dua peminjaman valid dan
  seluruh action count 0. Tidak ada transaksi dummy yang dibuat.
- Browser produksi 1440/768/390 memakai service Prisma aktual: ranking/detail
  tujuan, positive empty action, posisi setelah grafik, satu request awal,
  panel putih, dan tanpa overflow lolos.
- Fixture UI in-memory terpisah menguji lima bar, empat action, klik area bar/
  row, keyboard Enter/focus, judul panjang, zero suppression, empty, loading,
  kegagalan HTTP/parsial, retry per panel, serta independensi PeriodSelector
  pada ketiga ukuran. Tidak ada runtime exception atau request non-GET.
- Tidak ada perubahan schema, auth, route, expiry reservasi, aturan transaksi,
  alur e-book, atau alur pengiriman notifikasi.

Screenshot dan hasil pengujian lokal berada di `backend/.tmp/insights-*`,
diabaikan Git. Preview pengujian tidak memulai scheduler/SMTP dan tidak menulis
database.
