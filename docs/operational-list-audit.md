# Audit penyederhanaan tabel dan list

Tanggal: 21 Oktober 2026. Lingkup: presentasi data operasional Admin dan Anggota. Data, tipe, pencarian, filter, pagination, endpoint, handler, ID internal dan konfirmasi existing dipertahankan.

## Admin

| Halaman | Sebelum | Setelah | Informasi sekunder dan akses lengkap |
| --- | --- | --- | --- |
| Keanggotaan | 9 kolom: nama, jenis, email, WhatsApp, verifikasi, pinjaman, overdue, terdaftar, aksi; status akun di nama | 6: nama, jenis, kontak, pinjaman, overdue, aksi | Email dan WhatsApp digabung. Status akun, verifikasi dan tanggal terdaftar hanya di Detail Anggota; filter verifikasi/jenis tetap. Mobile mengikuti pengurangan yang sama. |
| Data Buku | 7: buku, kode, tahun, stok tersedia, ketersediaan, status, aksi | 5: buku, kode, stok, status, aksi | Stok memuat tersedia/total dan ketersediaan. Tahun dan metadata katalog tetap di Detail Buku. |
| E-Book | 6: E-Book, kode, tahun, mode akses, status, aksi | 4: E-Book, mode akses, status, aksi | Judul dan penulis tetap bersama. Kode/tahun tetap di Detail E-Book. |
| Hibah Buku | 8: ID, daftar buku, jumlah judul, total buku, pemberi, tanggal, status, aksi | 5: pemberi, tanggal, ringkasan, status katalogisasi, aksi | Jumlah judul/buku digabung; ID dan seluruh judul tetap di Detail Hibah. Mobile mengikuti susunan ringkas. |
| Reservasi | 6: anggota, buku, diajukan, batas pengambilan, status, aksi | 6, dipertahankan | Semua kolom membantu keputusan pengambilan; tidak ada ID transaksi visual. Tipografi dan proporsi diperbaiki. |
| Peminjaman fisik | 7: anggota, buku, dipinjam, jatuh tempo, perpanjangan, status, aksi | 6: anggota, buku, dipinjam, jatuh tempo, status, aksi | Perpanjangan nonnol menjadi teks sekunder di tanggal jatuh tempo karena belum ada Detail Transaksi terpisah yang menampilkannya. |
| Akses E-Book di Peminjaman | 6: anggota, E-Book, kode, mulai, batas akses, status | 5: anggota, E-Book, mulai, batas akses, status | Kode menjadi teks sekunder bersama judul; tanggal/status tetap. |
| Pengembalian | 7: anggota, buku, dipinjam, jatuh tempo, perpanjangan, status, aksi | 5: anggota, buku, jatuh tempo, status, aksi | Tanggal pinjam tetap tersedia di Detail Anggota/Buku dan halaman Peminjaman. Perpanjangan relevan tetap di Peminjaman. Aksi **Konfirmasi Pengembalian** dan **Buku Hilang** tetap teks saja, dengan ConfirmDialog existing. |
| Buku Hilang & Penggantian | 8: ID, anggota, buku, dipinjam, jatuh tempo, perpanjangan, status, aksi | 5: anggota, buku, jatuh tempo, status, aksi | ID disembunyikan; detail anggota/buku tetap melalui alur existing. Perpanjangan nonnol tetap sebagai teks sekunder agar informasi ini tidak hilang dari UI. Tidak membuat status proses baru. |
| Sirkulasi E-Book — Aktif | 5: anggota, E-Book, mulai, batas akses, status | 5, dipertahankan | Semua tanggal/status relevan untuk monitoring. Halaman ini tidak mempunyai aksi administrasi atau Detail Sirkulasi; tidak ditambahkan aksi palsu. |
| Sirkulasi E-Book — Antrean | 6: anggota, E-Book, masuk antrean, posisi, status, batas klaim | 4: anggota, E-Book, masuk antrean, status akses | Posisi dan batas prioritas/claim tetap sebagai teks sekunder dalam status akses. Tidak dibuang karena tidak tersedia di Detail lain. |
| Sirkulasi E-Book — Riwayat | 6: anggota, E-Book, mulai, batas akses, selesai, hasil | 5: anggota, E-Book, periode akses, selesai, hasil | Mulai dan batas akses digabung; seluruh informasi riwayat tetap. |
| Notifikasi | 6: anggota, transaksi, jenis, kanal, waktu, status | 4: jenis/konteks, penerima, status, waktu | Kode transaksi teknis disembunyikan; judul buku menjadi konteks. Kanal di status; email/WhatsApp tetap sekunder pada penerima untuk pemeriksaan delivery. Baris Sistem tetap membuka target existing dan menandai dibaca. Email/WhatsApp tidak diberi tautan Detail yang sebenarnya tidak ada. Mobile mengikuti susunan ini. |
| Dashboard — Koleksi Paling Sering Dipinjam | Judul, bar, jumlah, tautan detail | Informasi sama, hierarki 14/12 | Judul lengkap tersedia melalui title/aria-label dan Detail Buku. Grafik/bar/data tidak diubah. |
| Dashboard — Memerlukan Tindakan | Jumlah, konteks, keterangan, target spesifik | Informasi sama, hierarki 14/12 | Keterangan operasional dan seluruh target spesifik tetap. Tidak mengubah KPI/chart. |
| Detail Hibah — Daftar Buku | Nomor, judul, jumlah | 3 kolom tetap; ukuran teks diselaraskan | Ini halaman Detail: seluruh judul/jumlah tetap lengkap. |
| Detail Anggota/Buku — Transaksi Terkait | Judul/kode transaksi, metadata transaksi, tanggal/status | Informasi lengkap tetap; primary 14px dan secondary/badge 12px | Tidak mengurangi informasi Detail; menyelaraskan tipografi row list yang sebelumnya 9–12px. Heading Detail Anggota juga membungkus email panjang agar tidak overflow mobile. |
| Laporan | KPI, grafik analitis dan ekspor CSV | Tetap | Tidak ada tabel/list operasional yang perlu dikurangi. Struktur CSV dan data analitis tetap lengkap. |

## Anggota

| Halaman/list | Informasi utama dipertahankan | Disembunyikan atau dirapikan |
| --- | --- | --- |
| Ringkasan — Reservasi Hampir Habis | Judul, batas pengambilan, countdown, tautan existing | Kode buku duplikat dihapus dari ringkasan; tetap di Detail Buku. Hero, statistik, profil dan reminder tidak diubah. |
| Tenggat Terdekat | Buku, status penting, tanggal, tautan Pinjaman | Informasi sama; ukuran primary/secondary/badge diselaraskan. |
| Reservasi Saya, termasuk riwayat reservasi | Buku/penulis, lokasi, batas pengambilan, countdown, status dan batalkan | Kode buku, kode eksemplar dan tanggal pembuatan tidak memenuhi list awal. Kode buku ada di Detail Buku; metadata transaksi tetap internal dan tampilan admin terkait. |
| Pinjaman Saya | Buku, jatuh tempo, status, perpanjang, info penggantian, Detail | Kode buku dipindah ke Detail Buku. Tanggal pinjam sekunder; perpanjangan nonnol tetap sekunder karena tidak ada Detail Transaksi anggota terpisah. |
| Riwayat Pinjaman | Buku, periode aktivitas, status akhir dan tautan Detail Buku | Kode buku dan badge Fisik yang berulang disembunyikan; tetap di Detail Buku. Perpanjangan nonnol tetap sekunder. Redirect `/dashboard/riwayat` ke tab riwayat existing dipertahankan. |
| E-Book Saya — Sedang Dipinjam | Buku, progres, batas akses dan aksi baca/kembalikan | Tidak menghapus informasi yang menentukan akses; hierarki dan wrap diperbaiki. |
| E-Book Saya — Antrean | Buku, posisi, status tawaran, batas klaim/countdown, klaim/batalkan | Semua informasi keputusan tetap, dengan hierarchy yang konsisten. |
| E-Book Saya — Pernah Dibaca | Buku, progres, status ketersediaan, baca/detail/pinjam/antrean existing | Status sirkulasi tetap diperlukan untuk memilih aksi. |
| Notifikasi | Judul, pesan, waktu, status dibaca dan aksi existing | Pesan lengkap dipertahankan karena tidak ada halaman Detail Notifikasi terpisah. Whole-card link, read logic dan control terpisah tetap. |
| Katalog Koleksi — grid existing | Sampul, judul, penulis, kode/tahun/bahasa, ketersediaan dan Detail | Katalog adalah discovery list; identitas katalog membantu memilih buku sehingga tidak dihapus. Typography khusus `.memberCatalog`: judul 15px, metadata/badge minimal 12px, tombol teks 14px. Katalog public tetap. |

## Pengecualian dan batas lingkup

- Detail Anggota/Buku/E-Book sengaja tetap lengkap; list transaksi di dalam Detail tetap mempertahankan metadata untuk progressive disclosure.
- Form tambah/edit Hibah dan pengaturan konten adalah editor, bukan daftar operasional. Field/editor, profil, auth, sidebar dan halaman informasi/public tidak didesain ulang.
- File `admin/dminGrantsPage.tsx` adalah duplikat yang tidak dipakai route/import; tidak disentuh.
- Tidak membuat halaman Detail Transaksi/Sirkulasi baru. Informasi yang hanya tersedia di list (perpanjangan, detail antrean dan pesan notifikasi) tetap sekunder.
- Pencarian ID internal hanya berlaku jika backend sebelumnya mendukung. Backend transaksi existing mencari nama/email/WhatsApp/judul/kode buku/eksemplar; dukungan pencarian kode berformat RSV/TRX tidak ditambahkan dalam task presentasi ini.

## Tipografi dan layout

- Tabel operasional opt-in `data-record-list`: body/primary 14px, secondary/header/badge 12px; primary semibold; cell padding 14px.
- Card/list operasional opt-in `data-record-card`: primary 14px, secondary/badge 12px. Countdown fungsional tetap memakai hierarki existing.
- Kolom aksi tetap icon-only dengan tooltip/aria-label; pengecualian Pengembalian teks 14px, tinggi 40–44px, success/danger soft. Tombol bertumpuk ketika ruang sempit dan sejajar pada layar lebar.
- Desktop: table-layout fixed, proporsi per halaman, text wrap yang wajar, tanpa minimum width yang memaksa scroll desktop.
- Mobile: card existing untuk Keanggotaan/Hibah/Notifikasi; tabel transaksi/koleksi tetap mempunyai scroll internal existing supaya font dan aksi tidak diperkecil. Tidak ada overflow horizontal halaman.

## Verifikasi

Browser memakai preview produksi terpisah dan fixture in-memory; tidak menyentuh database atau mengirim pesan asli.

| Pemeriksaan | Hasil |
| --- | --- |
| Layout Admin/Anggota 1440/768/390, data normal dan nama/email/judul panjang | Lolos 132 pemeriksaan layout, ditambah pemeriksaan ulang Keanggotaan setelah penyesuaian header. Tidak ada overflow halaman atau scroll tabel desktop normal. |
| Sirkulasi E-Book terisi, tiga tab, normal/panjang, 1440/768/390 | Lolos 18 pemeriksaan dengan respons fixture khusus browser; lihat batas integrasi di bawah. |
| Katalog Anggota normal/panjang pada tiga ukuran | Lolos; judul 15px, kode/badge/status 12px, tombol teks 14px, title lengkap dan Detail tetap. |
| Detail Anggota/Buku normal/panjang pada tiga ukuran | Lolos 12 pemeriksaan; metadata tetap lengkap, row primary 14px/secondary 12px, tanpa overflow termasuk email panjang pada 390px. |
| Loading/empty state | Seluruh tabel admin, termasuk ketiga tab Sirkulasi, memakai colSpan yang sesuai. Card mobile Keanggotaan/Hibah/Notifikasi dan empty state anggota diperiksa pada tiga ukuran. |
| Interaksi pada tiga ukuran | Pengambilan, pengembalian, buku hilang, pembatalan anggota, perpanjangan, notifikasi mark-read dan navigasi lolos. Control read tidak ikut navigasi card. |
| Aksesibilitas | Tooltip melalui focus, aria-describedby, Escape; Space/Enter pada tombol; cancel tanpa mutation; submit ganda dicegah; pengembalian tetap text-only 14px dengan tinggi 40–44px. |
| Search/filter/pagination | Parameter existing diteruskan pada seluruh 10 halaman admin operasional; mencakup email search, filter status/jenis, pagination page 2 dan filter UNVERIFIED ketika kolom verifikasi tersembunyi. Respons data pada pengujian ini menggunakan fixture. |
| TypeScript | `npx.cmd tsc --noEmit` dan pemeriksaan TypeScript build lolos. |
| Lint | ESLint seluruh TSX yang berubah lolos. Dua pengecualian lint yang sempit mendokumentasikan fetch-effect/Date.now existing pada Detail Anggota; lifecycle tidak diubah untuk task presentasi ini. |
| Test relevan | 20/20 lolos: Button, ConfirmDialog, StatCard, AdminDashboard, AdminDashboardInsights dan TransactionTrendChart. |
| Perlindungan perubahan | Pemeriksaan AST pada 22 template mempertahankan key, href, aria-label, handler, disabled/loading, state/API call dan seluruh prop ConfirmDialog. Backend/API/types/schema tidak berubah. |
| Build dan review | `npm.cmd run build` lolos; `git diff --check` lolos. Review terpisah tidak menemukan masalah material. |
| Penutupan pengujian | Preview port 3214, fixture port 4321 dan Chrome headless port 9350 ditutup setelah command line proses diverifikasi. Server development pengguna tidak dihentikan. |

**Batas integrasi existing:** `admin/ebooksProxy.ts` hanya mengizinkan GET root/ID numerik, sehingga `/api/admin/ebooks/circulation` ditolak 404 sebelum mencapai backend. Aturan proxy/API tidak diubah. Error state existing diperiksa; layout terisi/loading/empty ketiga tab diuji melalui interception fixture pada browser pengujian saja. Pengujian ini tidak menyatakan integrasi endpoint tersebut sudah diperbaiki.

## Seluruh file yang diubah

- `admin/AdminBookDetail.tsx`
- `admin/AdminBooks.module.css`
- `admin/AdminBooksPage.tsx`
- `admin/AdminDashboardInsights.tsx`
- `admin/AdminEBookCirculation.module.css`
- `admin/AdminEBookCirculationPage.tsx`
- `admin/AdminEBooksPage.tsx`
- `admin/AdminGrantDetail.tsx`
- `admin/AdminGrants.module.css`
- `admin/AdminGrantsPage.tsx`
- `admin/AdminLoansPage.tsx`
- `admin/AdminLostBooksPage.tsx`
- `admin/AdminMemberDetail.tsx`
- `admin/AdminMembers.module.css`
- `admin/AdminMembersPage.tsx`
- `admin/AdminNotifications.module.css`
- `admin/AdminNotificationsPage.tsx`
- `admin/AdminReservationsPage.tsx`
- `admin/AdminReturnsPage.tsx`
- `admin/AdminTransactions.module.css`
- `app/layout.tsx`
- `catalog/Catalog.module.css`
- `components/records.css`
- `docs/operational-list-audit.md`
- `docs/superpowers/plans/2026-10-21-operational-lists.md`
- `members/EBooks.module.css`
- `members/EBooksPage.tsx`
- `members/History.module.css`
- `members/HistoryPage.tsx`
- `members/LoanCard.tsx`
- `members/Loans.module.css`
- `members/MemberRightPanel.tsx`
- `members/MemberUI.tsx`
- `members/Members.module.css`
- `members/Notifications.module.css`
- `members/NotificationsPage.tsx`
- `members/ReservationCard.tsx`
- `members/Reservations.module.css`
- `members/SummaryPage.tsx`
