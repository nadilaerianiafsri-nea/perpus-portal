# Laporan buku hilang anggota — 22 Oktober 2026

## Audit dan keputusan implementasi

Sebelum perubahan, kasus hilang memakai `Loan.status = HILANG` dan `BookCopy.status = HILANG`, ditetapkan oleh `MembersService.finishLoan`. Menu admin hanya memonitor loan tersebut dan membuka detail anggota. Belum ada entity laporan tersendiri, detail kasus, state verifikasi, atau penyelesaian penggantian yang tersimpan.

Implementasi memperluas **Loan yang sama**, tanpa tabel laporan atau menu admin kedua. Kebijakan penggantian existing tetap buku yang sama/sesuai kebijakan perpustakaan dan tanpa denda uang. Penerimaan penggantian dicatat oleh admin; tidak membuat stok pengganti tanpa data katalog dan tidak mengaktifkan kembali eksemplar asli yang hilang. Tidak menambahkan reject, pembatalan, atau buku ditemukan karena flow tersebut tidak tersedia sebelumnya.

## Flow anggota

1. Pinjaman Saya menyediakan **Laporkan Buku Hilang** soft-danger hanya untuk pinjaman fisik aktif, belum dikembalikan, dan belum memiliki laporan.
2. ConfirmDialog existing: Laporkan Buku Hilang → Batal / Kirim Laporan. Tidak meminta data yang sudah ada pada loan. Flow memakai konfirmasi saja, tanpa field catatan tambahan.
3. Sukses menutup dialog, memuat ulang data, menampilkan **Menunggu Verifikasi**, menghilangkan tombol lapor dan Perpanjang. Tidak ada full browser reload.
4. Detail Pinjaman `/dashboard/pinjaman/[id]` menampilkan buku, tanggal pinjam/jatuh tempo, serta status dan tanggal laporan/verifikasi/selesai yang tersedia. Sebelumnya belum ada route detail pinjaman anggota; tombol Detail sekarang membuka detail transaksi tersebut.
5. Kasus selesai tetap dapat dilihat melalui daftar/detail pinjaman untuk memantau laporan, diberi status Selesai dan dikeluarkan dari hitungan Sedang Dipinjam. Tidak memalsukan transaksi tersebut sebagai buku dikembalikan.

## Flow admin dan mapping state

Menu **Transaksi > Buku Hilang & Penggantian** existing kini menerima laporan anggota dan kasus admin lama. Filter status aktual: Menunggu Verifikasi / Proses Penggantian / Selesai. Detail kasus `/admin/transaksi/buku-hilang-penggantian/[id]` menampilkan sumber, anggota/kontak, buku/eksemplar/lokasi, tanggal pinjaman, dan tahap penggantian tanpa mengulang data.

| Tahap | Report state pada Loan | Loan | BookCopy |
| --- | --- | --- | --- |
| Anggota submit | `MENUNGGU_VERIFIKASI`, sumber `ANGGOTA` | Tetap `AKTIF`, dueAt/returnedAt tidak berubah | Tetap `DIPINJAM` |
| Admin verifikasi | `PROSES_PENGGANTIAN` | `HILANG` melalui finishLoan existing | `HILANG` melalui finishLoan existing |
| Admin mencatat penggantian diterima | `SELESAI`, resolvedAt diisi | Tetap `HILANG`; tidak membuat pengembalian fiktif | Tetap `HILANG`; tidak mengaktifkan eksemplar asli |
| Admin menandai hilang langsung melalui Pengembalian | `PROSES_PENGGANTIAN`, sumber `ADMIN` | `HILANG` | `HILANG` |

Kasus legacy `HILANG` tanpa metadata dipetakan sebagai sumber ADMIN / Proses Penggantian. Tanggal yang dahulu tidak disimpan tetap kosong, tidak diambil dari tanggal pinjam atau waktu render.

Admin memeriksa detail sebelum Verifikasi Kehilangan dan Selesaikan Penggantian, masing-masing melalui ConfirmDialog existing. Pengembalian normal pada row dengan laporan aktif diganti Detail Laporan; backend juga menolak normal-return yang bertentangan. Untuk row normal, tombol teks Pengembalian/Buku Hilang existing tetap dipertahankan.

## Business rules dan security

- Session user berasal dari `req.user.sub`, dilindungi JwtAuthGuard + MemberRoleGuard existing (role, verifikasi, dan status aktif tetap berlaku).
- Member report dan detail memeriksa ownership di service; loan anggota lain menghasilkan **403** tanpa write.
- Report hanya menerima loan fisik aktif, returnedAt kosong, eksemplar DIPINJAM dengan bookId yang sesuai. E-Book, loan selesai, dan copy tidak valid ditolak.
- Body endpoint konfirmasi ketat/kosong; memberId, userId, source, status dan field lain dari client ditolak. ID route divalidasi integer database positif.
- Report/extend/finish/complete mengunci row Loan yang sama dalam transaction existing. Satu primary-key Loan hanya menyimpan satu laporan; request pending yang berulang idempotent tanpa event/update kedua. Single-flight UI mencegah klik ganda.
- Perpanjangan ditolak backend saat ada laporan, bukan hanya disembunyikan di UI. Durasi pinjaman/perpanjangan dan aturan reservasi/E-Book tidak diubah.
- CSRF, pembatasan body, session proxy, cache private/no-store, dan perizinan admin memakai infrastructure existing. Tidak menambahkan mekanisme auth/rate-limit baru; mutation anggota existing tidak memakai limiter khusus.
- Anggota tidak mendapat action verifikasi/penyelesaian. Detail anggota tidak mengembalikan data user/admin internal; informasi kontak anggota lengkap hanya pada detail admin yang terjaga role.
- Dashboard hanya disesuaikan agar kasus yang sudah resolved tidak lagi dihitung sebagai kehilangan yang memerlukan tindakan; tidak ada redesign dashboard.

## Notifikasi existing

- Satu row Notification receipt untuk anggota, eventKey `loan:{id}:lost-report`, link `/dashboard/pinjaman/{id}`.
- Event yang sama diproyeksikan sebagai SYSTEM **Laporan Buku Hilang Baru** pada notifikasi admin, link detail kasus; admin read/unread tetap menggunakan AdminNotificationRead existing.
- Verifikasi menggunakan event lost existing dan penyelesaian memakai event `loan:{id}:lost-completed`, keduanya mengarah ke detail pinjaman anggota.
- Tidak membuat channel/worker/tabel notifikasi baru dan tidak mengirim SMTP baru. Allowlist anggota diperluas hanya untuk ID pinjaman kanonis/positif, tanpa URL eksternal/query/suffix. Label SYSTEM admin laporan menjadi **Laporan Diterima**, tidak memakai istilah Menunggu Pengambilan milik reservasi.
- Klik notifikasi admin dan anggota diuji: PATCH read berhasil lalu navigasi detail yang benar, dengan tracking baca terpisah.

## Endpoint/type/service

| Endpoint backend | Fungsi |
| --- | --- |
| `POST /members/me/loans/:id/lost-report` | Submit laporan dari session anggota, body kosong. |
| `GET /members/me/loans/:id` | Detail transaksi/laporan milik anggota. |
| `GET /members/admin/transactions/lost-books` | List existing diperluas pending/process/completed dan filter status. |
| `GET /members/admin/transactions/lost-books/:id` | Detail kasus admin. |
| `POST /members/admin/loans/:id/lost` | Endpoint existing untuk kehilangan langsung/verifikasi laporan. |
| `POST /members/admin/loans/:id/lost/complete` | Admin mencatat penyelesaian penggantian. |

Next proxy memakai prefix `/api` pada path di atas. State disimpan pada Loan; `lost-loan-state.ts` menyatukan pemetaan legacy dan view laporan yang digunakan service existing. Frontend memakai type/label/eligibility pada `members/lostReport.ts`.

## Database

Migration **`20261022000100_member_lost_report`** sudah diterapkan dengan `prisma migrate deploy`. Hanya menambah lima kolom nullable pada `loans`: `lostReportStatus`, `lostReportSource`, `lostReportedAt`, `lostVerifiedAt`, `lostResolvedAt`, serta satu index status/tanggal. Tidak mengubah enum LoanStatus/CopyStatus existing, tidak membuat tabel kedua, tidak menghapus atau menulis ulang row lama.

Client Prisma sudah digenerate. `prisma migrate status` mengonfirmasi database schema up to date. Tidak menjalankan reset, DROP, truncate, atau force-reset.

## Seluruh file perubahan task ini

| Kelompok | File |
| --- | --- |
| Anggota: list/dialog/layout | `members/LoanCard.tsx`, `members/LoanDialog.tsx`, `members/LoansPage.tsx`, `members/Loans.module.css` |
| Anggota: detail dan type | `members/LoanDetail.tsx`, `members/lostReport.ts`, `members/types.ts`, `app/dashboard/pinjaman/[id]/page.tsx` |
| Session proxy dan tujuan notifikasi | `members/proxy.ts`, `members/inputSecurity.ts` |
| Tes frontend/security proxy | `members/lostReport.test.mjs`, `members/lostNotification.test.mjs`, `members/proxy.loanDetails.test.mjs` |
| Admin: kasus dan integrasi | `admin/AdminLostBooksPage.tsx`, `admin/AdminLostBookDetail.tsx`, `admin/AdminReturnsPage.tsx`, `admin/AdminNotificationsPage.tsx`, `admin/adminTransactions.ts`, `admin/AdminLoanDetail.module.css`, `app/admin/transaksi/buku-hilang-penggantian/[id]/page.tsx` |
| Model dan migration | `backend/prisma/schema.prisma`, `backend/prisma/migrations/20261022000100_member_lost_report/migration.sql` |
| Backend flow/view | `backend/src/members/members.service.ts`, `backend/src/members/members.controller.ts`, `backend/src/members/lost-loan-state.ts` |
| Backend list/detail/admin notification | `backend/src/members/admin-transactions.service.ts`, `backend/src/members/admin-transactions.controller.ts`, `backend/src/members/admin-operations.service.ts` |
| Tes backend/regresi | `backend/src/members/lost-loan.spec.ts`, `backend/src/members/lost-loan.security.spec.ts`, `backend/src/members/lost-loan.admin.spec.ts`, `backend/src/members/admin-operations.spec.ts` |
| Dokumentasi | `docs/superpowers/plans/2026-10-22-member-lost-book-report.md`, `docs/member-lost-book-report-audit.md` |

## Verifikasi

- **1440 / 768 / 390px** lulus browser production-build: list/dialog/detail anggota, list/detail admin, serta seluruh alur pending → verifikasi → selesai. Tidak ada overflow halaman baru; pola mobile/table existing dipertahankan. Action 40–44px dan teks 14px.
- Keyboard Space/Enter, Escape untuk Batal tanpa POST, safe initial focus, pending mengunci pembatalan/klik ganda, serta error/retry: lulus.
- Submit laporan tidak mengubah copy, Loan status, dueAt atau returnedAt; verifikasi mengubah status melalui handler existing; selesai mempertahankan copy HILANG: lulus.
- IDOR403, role/session, CSRF, ID invalid, mass assignment, E-Book/returned/copy mismatch, duplikasi concurrent, extension/return conflict, legacy ADMIN cases: lulus.
- Notification receipt/status, admin projection, read tracking dan kedua link detail: lulus.
- Tes frontend **137/137 lulus**. Tes backend terkait **99/99 lulus** (workflow baru + HTTP security + reservasi + JWT/ownership + detail transaksi + operasi/notifikasi admin).
- TypeScript frontend dan lint semua file perubahan lulus. Build frontend/backend lulus. `git diff --check` lulus.
- Backend menggunakan runner native ESM lokal existing untuk mengatasi konflik Jest CommonJS/NestJS pada environment Node lokal; tidak mengubah konfigurasi produksi/dependency.
- Browser memakai service backend yang dibuild dan fixture memori. Tidak membuat laporan/loan/notifikasi percobaan pada database pengguna; perubahan database nyata hanya migration tambahan di atas. Tidak ada SMTP yang dikirim.

Artefak lokal ignored: `backend/.tmp/lost-*` (runner, fixture, log, screenshot, hasil browser). Review source independen tidak menemukan blocker. Tidak melakukan commit, rollback perubahan sebelumnya, atau mengerjakan fitur lain.
