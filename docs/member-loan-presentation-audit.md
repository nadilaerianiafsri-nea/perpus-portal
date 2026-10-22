# UI Pinjaman Anggota — 22 Oktober 2026

## Pinjaman Saya

- Card putih, border netral 1px dan shadow ringan. Aksen status dibatasi ke badge/peringatan.
- Desktop: cover 104px, informasi fleksibel, action 190px; tablet cover 88px/action 184px. Mobile memakai cover 72px dengan informasi di samping dan seluruh action bertumpuk di bawah.
- Judul 18px, penulis/label 13px, nilai tanggal 14px semibold. Tanggal berupa dl/time tanpa border, kotak, shadow atau background seperti input.
- Shared Button/ButtonLink berlabel Perpanjang, Detail, Laporkan Buku Hilang; tinggi 44px. Perpanjang navy dengan hover kuning, Detail soft navy, laporan danger-soft. Info Penggantian existing dipertahankan bila relevan.
- Lost report menggunakan label existing dan Detail Laporan; eligibility existing tetap mencegah pengulangan laporan/perpanjangan.
- Tab menggunakan variant primary/secondary existing agar active/hover/focus tidak tertimpa ghost style.

Audit statistik: nilai sebelumnya `readBookCount` adalah jumlah **bookId unik** pada history sourceType LOAN berstatus DIKEMBALIKAN, bukan progress membaca dan bukan jumlah seluruh transaksi. Label menjadi **Buku Dikembalikan**, nama variabel disesuaikan; filter, Set, nilai dan API tidak berubah.

## Detail Pinjaman

- Breadcrumb Pinjaman Saya / Detail Pinjaman, h1 dan garis kuning existing, Kembali variant back di kanan.
- Dua card: Buku (cover, judul, penulis tersedia, kode) dan Informasi Pinjaman (status, tanggal, jatuh tempo, jumlah perpanjangan, tanggal pengembalian bila ada).
- Status normal digabung ke informasi; tidak ada card besar yang hanya memuat status.
- Laporan Buku Hilang hanya tampil bila lostReport tersedia. Tanggal proses hanya dirender jika punya nilai. Tidak menambah field/catatan/lokasi yang tidak disediakan payload existing.
- Action di bawah, horizontal desktop dan stack mobile. Setelah perpanjangan, focus diarahkan ke Informasi Pinjaman; setelah laporan ke section laporan existing.
- CSS detail anggota menambah override lokal di atas style detail existing; tidak mengubah styling detail Admin.

## MemberShell dan audit detail lain

MemberShell memakai mode circulation/full-content existing untuk `/dashboard/pinjaman/*`, sehingga MemberRightPanel tidak dirender dan grid tidak menyisakan kolom kosong. Ringkasan tetap menampilkan profil, tenggat dan reminder existing. Avatar/topbar navigasi tetap berfungsi.

Detail Koleksi (`/dashboard/koleksi/[id]`) sudah memakai mode tanpa panel kanan. Detail Laporan anggota berada di halaman Detail Pinjaman yang sama. Tidak ada route detail Reservasi tersendiri dalam app/dashboard. Reader E-Book berada pada layout public/reader terpisah. Tidak dilakukan redesign halaman lain.

## Seluruh file task ini

1. `members/LoanCard.tsx`
2. `members/Loans.module.css`
3. `members/LoansPage.tsx`
4. `members/LoanDetail.tsx`
5. `members/LoanDetail.module.css` (baru)
6. `members/MemberShell.tsx`
7. `members/LoanPresentation.test.mjs` (baru)
8. Dokumen audit ini.

## Verifikasi

- Screenshot BEFORE dan AFTER 1440/768/390 diambil dari production preview dengan fixture memori yang sama; diperiksa visual desktop dan mobile.
- DOM/layout: title 18px, author 13px, metadata value 14px, border 1px, tombol 44px, desktop action 190px, tidak ada horizontal overflow.
- Detail: full-width desktop lebih dari 1000px, Buku/Informasi sejajar; mobile stack. Tidak ada profil kanan, Lihat Profil, atau section laporan kosong. Summary tetap memiliki MemberRightPanel.
- Tab aktif navy, riwayat/hash dan navigasi Detail/Kembali tetap bekerja. Keyboard Enter/Space membuka action/dialog, Escape membatalkan, focus terlihat/restored.
- Perpanjangan dari list dan detail diuji melalui MembersService existing dengan Prisma fixture memori: dueAt naik tepat 7 hari per aksi, extensionCount bertambah, status/copy/lostReport tidak berubah.
- Flow laporan melalui dialog existing: batal tanpa POST; error/retry; cegah double submit; menunggu verifikasi; verifikasi Admin; proses penggantian; selesai; Detail Laporan; notifikasi existing. Seluruh flow lulus pada 1440/768/390.
- Judul/penulis panjang dan kondisi overdue diuji list/detail pada 1440/768/390, tanpa overflow. Overdue ditunjukkan dengan wording dan warna semantic halus.
- 145 unit test lulus (satu suite browser custom-404 opt-in dilewati dalam unit run; bukan scope task ini). Empat regression test presentasi baru lulus.
- TypeScript, lint file TS/TSX/MJS perubahan, diff whitespace check, frontend build lulus.
- Review independen tidak menemukan masalah actionable pada perubahan task ini.

Artefak lokal (diabaikan git): `backend/.tmp/loan-ui-before-*.png`, `loan-ui-after-*.png`, `loan-ui-long-*.png`, `loan-ui-overdue-*.png`, `loan-ui-results.json`, `loan-ui-extend-results.json`, log `loan-ui-*.log`. Preview/fixture/Chrome pengujian ditutup setelah verifikasi; server pengguna tidak dihentikan.

Tidak ada perubahan eligibility/helper aturan, +7 hari, handler operasi, ConfirmDialog/LoanDialog, endpoint, ownership, auth, notifikasi, backend, database atau Prisma. Seluruh mutasi uji hanya terjadi di memori, tanpa SMTP/database pengguna.
