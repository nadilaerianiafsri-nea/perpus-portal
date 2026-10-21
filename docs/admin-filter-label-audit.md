# Audit label filter dropdown Admin

Tanggal: 21 Oktober 2026.

## Hasil audit

| Halaman | Hasil / default trigger |
| --- | --- |
| Keanggotaan | Tanpa caption; Semua Jenis Anggota, Semua Verifikasi |
| Reservasi | Tanpa caption; Semua Status Reservasi, Semua Jenis Anggota |
| Peminjaman | Tanpa caption; Semua Status, Semua Jenis Anggota, Semua Jatuh Tempo |
| Pengembalian | Tanpa caption; Semua Pinjaman Aktif, Semua Jenis Anggota. Default existing dipertahankan karena daftar berisi pinjaman aktif yang menunggu pengembalian |
| Buku Hilang & Penggantian | Tanpa caption; Semua Status Proses, Semua Jenis Anggota, Semua Perpanjangan |
| Data Buku | Tanpa caption; Semua Ketersediaan |
| Hibah | Tanpa caption; Semua Status Hibah, Semua Tahun |
| Dashboard / Laporan | PeriodSelector sudah tanpa label visual; accessible name dan dialog rentang tanggal dipertahankan |
| E-Book | Filter status berupa tombol existing; tidak membuat dropdown baru |
| Sirkulasi E-Book | Search dan tab existing; tidak memiliki dropdown filter redundan |
| Notifikasi | Tab/filter tombol existing; dropdown jumlah data memakai label tersembunyi untuk aksesibilitas dan sudah sesuai |
| Pengaturan | Field konfigurasi/form tetap memiliki label |
| Tambah/Edit Buku, E-Book, Anggota, Hibah | Seluruh label form tetap dipertahankan |

## Implementasi

- Menghapus caption visual pada caller AppSelect dan menambahkan aria-label spesifik untuk setiap filter.
- Menghapus selector CSS caption span:first-child agar root AppSelect tidak menerima style caption setelah caption dihapus; gap wrapper filter menjadi nol.
- Tinggi search Keanggotaan/Hibah mengikuti token existing 48 px. Input rentang stok Data Buku juga sejajar dengan control dropdown.
- Kolom toolbar dengan tiga dropdown diperlebar menjadi 210 px supaya Semua Jenis Anggota tidak membungkus. Toolbar tersebut wrap pada 1320 px dan stack satu kolom pada 700 px, tanpa mengubah grid statistik.
- File legacy dminGrantsPage.tsx ikut diaudit; dua native select-nya memakai AppSelect existing dengan handler dan option value tetap sama.
- Komponen/panel AppSelect dan behavior PeriodSelector tidak diubah. Actual option value, state, handler, query, API, pagination reset, backend dan database tetap sama; diperiksa melalui TypeScript AST.

## Verifikasi

- 13 halaman Admin x 1440/768/390: 39 kasus lolos. Accessible name, tanpa caption visual/dropdown label, tinggi 48 px, baseline search desktop, font 14 px, serta tanpa overflow halaman.
- Semua 15 filter pada tujuh halaman aktif diuji dengan keyboard ArrowDown/Enter dan focus; perubahan value/query serta reset page=1 terverifikasi terhadap fixture lokal. Filter status Buku Hilang tetap memakai logika lokal existing.
- 7 halaman form tambah/edit x 3 lebar: 21 kasus lolos; label visual dan accessible name tetap ada. PeriodSelector custom range dan label Dari/Sampai tetap bekerja melalui keyboard.
- Breakpoint toolbar tambahan 1321/1320/1181/700: lolos, tidak overflow, control tetap 48 px.
- TypeScript npx tsc --noEmit: lolos.
- ESLint pada tujuh halaman aktif yang berubah: lolos. Satu error existing react-hooks/set-state-in-effect pada admin/dminGrantsPage.tsx tetap ada; baris 115 bergeser menjadi 117 akibat import. Dibandingkan dengan HEAD: logic dan jenis temuan sama. Tidak dinonaktifkan/disembunyikan.
- Test frontend terkait: 80 lolos, 0 gagal.
- AppSelect browser suite: 32 skenario + parent test (33 TAP pass), 0 gagal.
- Build produksi final npm run build: lolos. git diff --check: lolos. Review terpisah: tidak ada temuan actionable.
- Browser memakai build produksi dan fixture lokal tanpa database/SMTP. Ini memverifikasi UI, keyboard, dan request existing; bukan transaksi produksi.

## Perbaikan pendukung build

Build awal gagal karena penanda merge conflict sudah tersimpan di HEAD pada app/HomeLandingRevision.module.css. Konflik pada satu rule typography diselesaikan dengan mempertahankan var(--text-secondary) dan line-height 1.45. Tidak ada redesign landing page.

## File diubah

- `admin/AdminBooksEnhancements.module.css`
- `admin/AdminBooksPage.tsx`
- `admin/AdminGrants.module.css`
- `admin/AdminGrantsPage.tsx`
- `admin/AdminLoansPage.tsx`
- `admin/AdminLostBooksPage.tsx`
- `admin/AdminMembers.module.css`
- `admin/AdminMembersPage.tsx`
- `admin/AdminReservationsPage.tsx`
- `admin/AdminReturnsPage.tsx`
- `admin/AdminTransactions.module.css`
- `admin/dminGrantsPage.tsx`
- `app/HomeLandingRevision.module.css`
