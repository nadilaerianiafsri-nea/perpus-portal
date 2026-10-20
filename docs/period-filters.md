# Filter periode

`components/PeriodSelector.tsx` menyediakan satu dropdown: Hari Ini (`today`), Minggu Ini (`this-week`), Bulan Ini (`this-month`), dan Rentang Waktu (`custom`). Preset langsung menerapkan periode. Rentang custom dibuka sebagai popover compact, baru diterapkan setelah valid; Batal/Escape/klik di luar tidak mengubah periode aktif.

`shared/period.ts` menggunakan tanggal kalender Asia/Jakarta, Senin sebagai awal minggu, dan validasi rentang maksimal 366 hari sesuai API existing. `adminOperations.ts` tetap mengekspor utility tanggal WIB untuk mempertahankan pemakai existing.

| Area | Hasil audit |
| --- | --- |
| Dashboard admin | Default Bulan Ini; selector berada di header Transaksi Peminjaman. Filter dan refresh hanya memuat grafik, bukan KPI/donut. |
| Laporan admin | Default Bulan Ini; selector berada di toolbar laporan. Respons lama dibatalkan; data sebelumnya tetap diberi label saat memuat/gagal. Ekspor memakai data periode yang sudah selesai dimuat. |
| Peminjaman admin | Dropdown Jatuh Tempo dipertahankan: ini memfilter tenggat hari ini/7 hari ke depan/30 hari ke depan/bulan kalender, bukan histori aktivitas. API existing menerima enum `due`, bukan custom `from/to`. Default semua tanggal mempertahankan visibilitas pinjaman aktif. |
| Katalog public/anggota | Filter tahun terbit dipertahankan sebagai metadata koleksi; tidak diganti menjadi periode aktivitas. Query `yearFrom/yearTo` tetap sama. |
| Hibah public/admin | Filter tahun penerimaan tetap berupa tahun. Tanggal penerimaan pada form adalah data hibah, bukan filter periode. |
| Halaman anggota lainnya | Reservasi, Pinjaman, Riwayat, E-Book, dan Notifikasi tidak mempunyai filter periode aktivitas existing. Tidak ditambahkan filter baru. |
| Public lainnya dan halaman admin lain | Tidak ditemukan filter periode aktivitas existing; tidak ditambahkan filter baru. |

Endpoint, schema, auth, status transaksi, dan perhitungan laporan tidak berubah. Preset dikirim melalui parameter `from/to` existing. Pilihan periode sebelumnya tidak disimpan ke URL, sehingga tidak ditambahkan mekanisme query baru.
