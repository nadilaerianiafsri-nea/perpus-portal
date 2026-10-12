# Audit input Perpustakaan Kemenkum Riau — 12 Oktober 2026

Hardening diterapkan pada boundary input dan output existing. Tidak ada migration,
perubahan schema, desain besar, atau perubahan aturan reservasi/pinjaman.
Verifikasi terhadap database MySQL asli masih tertunda: MySQL80 berhenti dan
akun proses ini tidak memiliki izin Windows untuk membuka layanannya. Percobaan
awal berhenti sebelum pembuatan fixture. Tidak ada klaim pengujian MySQL berhasil.

## Cakupan route dan input

| Area | Halaman/action yang diaudit | Proteksi |
| --- | --- | --- |
| Public | Beranda, Tentang, Panduan, FAQ | Konten React sebagai text; pencarian FAQ memakai SearchField reusable; halaman statis tidak menerima body input |
| Public katalog | Koleksi, E-Book, detail `/koleksi/[id]`, reader `/e-book/[id]/baca` | Search/filter/array query/ID dibatasi; query Prisma parameterized; URL cover/source diperiksa kembali saat render; iframe hanya sumber lokal yang diizinkan |
| Public hibah/kontak | Hibah Buku, Kontak | Search/filter plain text; body kontak hanya nama/email/pesan; batas panjang, penolakan markup/CRLF, email output escaping dan Reply-To tervalidasi |
| Auth | Login, Register 3 jenis anggota, Check Email, Verify Email, Resend Verification, Forgot/Reset Password | Body/query whitelist, tipe dan panjang, token/ID checks, password tidak diubah, CAPTCHA production fail closed, rate limit |
| Anggota | `/dashboard`, reservasi, pinjaman, riwayat, e-book, notifikasi, profil | Body action/profile/progress dibatasi; ID positif dalam rentang database; userId berasal dari sesi server; ownership existing dipertahankan; URL notifikasi hanya route anggota yang diizinkan |
| Admin anggota | Keanggotaan list/detail/edit | Guard role server; plain text semua field termasuk field tambahan yang sedang tidak aktif; query/filter/status whitelist |
| Admin koleksi | Buku dan E-Book list/detail/tambah/edit/status; BookCopy | Body/type/status whitelist; numeric bounds; plain text; URL HTTP/HTTPS atau asset lokal yang diizinkan; copy code dihasilkan server |
| Admin hibah | Hibah Buku list/detail/tambah/edit | Body dan nested item whitelist, maksimal 100 item, tanggal/status/quantity/text checks |
| Admin transaksi | Reservasi, pengambilan, peminjaman, pengembalian, buku hilang/penggantian | Guard role, query/ID validation; aksi tanpa field menolak body tambahan; aturan existing tetap |
| Admin upload | Upload dan penyajian cover | JPG/PNG/WebP, MIME+extension+signature, batas 5 MB, UUID filename, exclusive write, tanpa SVG/executable/path traversal; nosniff dan sandbox header |
| Admin halaman lain | Ringkasan, index transaksi, reminder, log email/WhatsApp | Proteksi layout/auth existing diaudit; halaman placeholder tidak memiliki form/action; tidak dibuat fitur atau profil admin baru |

Seluruh 31 route halaman anggota/admin existing (termasuk tambah/detail/edit)
diuji melalui HTTP tanpa sesi dan mengarah ke login. Ini memverifikasi proteksi
route, bukan uji seluruh UI dengan sesi/database produksi.

## Implementasi

- `shared/inputValidation.cjs`: parser Tokenizer **htmlparser2**, satu decoding
  entity untuk inspeksi, tanpa mengubah data yang disimpan; `containsHtml`,
  `textInputError`, `isSafeUrl`, dan `escapeHtml` dipakai lintas frontend/backend.
  HTML termasuk closing/incomplete/custom tags, comments, SVG dan event handlers
  ditolak. Password tidak masuk validator plain text.
- DTO/parser explicit existing diperketat. Project tidak memakai class-validator;
  penambahan ValidationPipe yang tidak menjalankan schema existing dihindari.
  Unknown keys, array/object pada scalar, boolean/numeric coercion tidak diterima
  pada input yang relevan. Normalisasi hanya field biasa, tanpa trim password.
- Backend: `Input tidak boleh mengandung HTML.` Frontend:
  `HTML tidak diperbolehkan pada kolom ini.` Input normal seperti O'Connor, R&D,
  Hukum & HAM, alamat, nama universitas, nomor WhatsApp tetap diterima.
- Transport shared membaca stream dengan batas byte sebelum membuat string.
  JSON Nest/auth/contact dibatasi 64 KiB; proxy anggota 16 KiB; proxy admin
  mempertahankan batas existing tambahan; upload proxy dibatasi 6 MiB dan file
  sebenarnya 5 MB. Request lintas origin ditolak; API client tanpa Origin tetap
  dapat bekerja dengan autentikasi/validasi yang sesuai.
- Helmet di backend; nosniff, frame protection dan Referrer-Policy di frontend.
  CSP frontend sengaja hanya `base-uri`, `object-src`, `frame-ancestors` agar Next
  scripts, reCAPTCHA, OSM dan reader existing tetap berjalan. CSP ini bukan
  kebijakan script nonce yang lengkap.
- Rate limit endpoint login/register/recovery/resend/contact memakai account
  hash dan batas socket yang lebih longgar untuk proxy. Header X-Forwarded-For
  arbitrary tidak dipercaya; route casing/trailing slash dinormalisasi.
- Tidak ditemukan `dangerouslySetInnerHTML`, `$queryRawUnsafe`, atau
  `$executeRawUnsafe` pada sumber aplikasi yang diaudit. Raw SQL untuk row lock
  memakai tagged template binding; pencarian menggunakan filter Prisma.
- Output email memakai escaping reusable, contact header injection ditolak juga
  bila MailService dipanggil internal. SMTP sender/MAIL_FROM/recipient flow tidak
  diubah; tes pengiriman memakai transport mock.
- Prisma adapter sebelumnya memuat **mariadb 3.4.5** terpisah dari dependency
  langsung 3.5.4. Override dependency menyamakan keduanya ke **3.5.4**, dan tes
  memeriksa modul yang benar-benar di-resolve adapter. Patch tersebut mencakup
  masalah SQL escaping NO_BACKSLASH_ESCAPES. Sumber:
  [advisory MariaDB](https://github.com/advisories/GHSA-r3rv-jm3r-62q2).

## Bukti pengujian

| Pemeriksaan | Hasil |
| --- | --- |
| Backend Jest ESM runner | 11 suite, **197/197 pass** |
| Shared/frontend API/form/email/driver node:test | **31/31 pass** |
| Backend build dan lint type-aware | Pass, tanpa error/warning setelah perbaikan |
| Frontend production build | Pass; 58 static pages generated, seluruh route terkompilasi |
| Frontend TypeScript dan lint file perubahan | Pass |
| Frontend HTTP | 14 halaman public 200 + security headers; 31 protected routes ke login; 11 cross-origin writes 403; 3 oversized bodies 413; unknown/repeated verify query dan logout mass assignment 400 |
| Ownership service dan JWT guard aktual, fixture in-memory | Member B tidak dapat cancel/extend/read/update progress milik A; tidak ada mutation; owned notification diterima; signed subject invalid/credential stale ditolak |
| Database integration test opt-in | **Belum lolos/dijalankan sampai selesai**, MySQL80 tidak tersedia; tidak ada fixture yang sempat ditulis |
| Diff dan local-secret scan | Pass; `.env`, schema dan migrations tidak berubah; nilai secret lokal tidak ditemukan dalam file perubahan |

Payload yang diuji meliputi `<p>`, `<script>`, `<img onerror>`, `<svg onload>`,
`<a href="javascript:...">`, `<div onclick>`, entity encoded dan incomplete tags;
javascript/data/vbscript URL; SQL-shaped strings; CRLF; tipe nested; unknown
role/userId/verified keys; oversized request; ID negatif/overflow; filename/MIME
tidak sesuai. Tes normal memastikan punctuation dan byte password tidak berubah.
Tes SQL-shaped string tidak menjalankan destructive SQL.

Perintah verifikasi (cwd root kecuali yang ditandai backend):

```powershell
npm.cmd run build
npx.cmd tsc --noEmit
# ESLint dijalankan pada semua file JS/TS frontend/shared yang berubah.
node --test shared/inputValidation.test.cjs shared/requestSecurity.test.cjs shared/displayUrls.test.cjs catalog/plaintextInput.test.cjs auth/registrationValidation.test.mjs auth/registrationApi.test.mjs admin/adminContent.security.test.mjs backend/test/mail-templates.test.cjs backend/test/database-driver.security.test.cjs
# cwd backend
npm.cmd run build
npm.cmd run lint
node test/run-registration-tests.cjs
# Hanya setelah layanan MySQL80/perpus_db aktif:
$env:RUN_INPUT_SECURITY_MYSQL='1'
node test/input-security.mysql.test.mjs
Remove-Item Env:RUN_INPUT_SECURITY_MYSQL
```

Test MySQL memakai JWT/Prisma/controller/service aktual, tiga akun anggota dan
akun admin sementara dengan UUID, mematikan SMTP dan scheduler reminder, serta
menghapus hanya fixture dengan email/code/ID exact. Tidak membuat migration.
Prisma generate dilakukan untuk menyamakan client lokal dengan schema existing.

## Batas dan risiko nyata yang tersisa

1. MySQL integration belum diverifikasi karena layanan berhenti/izin Windows.
   Bukti ownership saat ini berasal dari source audit dan service/guard aktual
   dengan fixture in-memory; tidak diklaim sebagai pengujian live database.
2. `npm audit` setelah patch driver: frontend **7 high**; backend **30** findings
   (2 low, 21 moderate, 6 high, 1 critical). MariaDB sudah hilang dari findings.
   Next.js 16.3.7 mempunyai advisory runtime cache/SSR/image optimization;
   Handlebars critical adalah dependency development ts-jest, bukan renderer
   MailService. Dependency upgrade framework/toolchain lain belum diterapkan.
3. Rate limit hanya memori satu instance dan reset saat restart. Deploy multi
   instance membutuhkan shared store/rate limit ingress. Batas socket bukan
   per-client-IP ketika semua request melewati proxy yang sama.
4. Batas ukuran bukan batas durasi menerima stream; timeout/slow-client dan
   total header size perlu dikonfigurasi pada server/ingress deployment.
5. Tidak dilakukan browser automation dengan akun/data nyata atau pengiriman
   SMTP nyata pada audit ini. CAPTCHA production memerlukan konfigurasi secret
   yang benar; fallback localhost hanya tersedia di non-production.
