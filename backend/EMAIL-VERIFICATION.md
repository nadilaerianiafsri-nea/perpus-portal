# Verifikasi email backend

Registrasi memakai auth, model User, bcrypt, JWT library, dan `emailVerified` existing. Tidak ada schema/migration baru atau perubahan frontend.

## Endpoint

- `POST /auth/register`: menyimpan akun pending dan mencoba mengirim email setelah transaction User/Profile selesai. Response tetap HTTP 201 dan menambahkan `verificationEmailSent`. Jika konfigurasi/pengiriman belum tersedia, nilainya `false` dan pesan menyebut email belum dapat dikirim. Jangan mengulangi registrasi; gunakan resend setelah layanan tersedia.
- `GET /auth/verify-email?token=...`: token valid mengaktifkan akun; pengulangan mengembalikan HTTP 200 bahwa email sudah diverifikasi. Token invalid/expired, klaim tidak cocok, email berubah, atau User tidak ada menghasilkan HTTP 400. Konfigurasi secret yang belum tersedia menghasilkan HTTP 503. Response tidak membuat sesi atau mengembalikan token.
- `POST /auth/resend-verification`, body `{ "email": "anggota@example.com" }`: HTTP 200 setelah SMTP menerima email. Akun terverifikasi tidak dikirimi email lagi. Input email invalid HTTP 400, cooldown HTTP 429, pengiriman/konfigurasi belum tersedia HTTP 503. Endpoint tidak membuat User baru.

Link dalam email langsung menuju endpoint backend di atas dan menampilkan response JSON. Halaman verifikasi frontend belum dibuat sesuai cakupan TUGAS 4.

## Token

JWT HS256 memakai `EMAIL_VERIFICATION_SECRET` yang berbeda dari `JWT_SECRET`, minimal 32 karakter. Berlaku 24 jam dengan audience `perpus-email-verification`, issuer `perpus-api`, purpose `email-verification`, serta ID/email User. Setiap pengiriman memiliki `jti` acak. Token sesi tidak diterima sebagai token verifikasi.

Link lama tetap valid sampai kedaluwarsa; setelah akun verified, pemakaian ulang bersifat idempotent. Tidak diperlukan penyimpanan token atau migration. Perubahan status menggunakan update bersyarat terhadap ID/email/status agar tidak memverifikasi alamat yang berubah saat request berjalan. Endpoint verify memakai `Cache-Control: no-store` dan `Referrer-Policy: no-referrer`.

## Konfigurasi

Nama variable tersedia di `.env.example`; isi credential hanya di `.env` yang diabaikan Git:

- `JWT_SECRET`: secret sesi existing.
- `EMAIL_VERIFICATION_SECRET`: secret acak terpisah, minimal 32 karakter.
- `EMAIL_VERIFICATION_URL`: URL lengkap backend yang bisa diakses penerima, berakhir `/auth/verify-email`. Gunakan HTTPS pada hosting; HTTP hanya di localhost.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`: provider SMTP. `SMTP_SECURE=true` untuk TLS langsung, umumnya port 465; koneksi lainnya menggunakan STARTTLS di luar localhost.
- `SMTP_USER`, `SMTP_PASS`: credential provider. Keduanya diisi bersama. SMTP lokal penampung tes dapat tanpa autentikasi.
- `MAIL_FROM`: alamat pengirim yang diizinkan provider.
- `FRONTEND_URL`: konfigurasi CORS existing, terpisah dari URL verifikasi backend.

Mailer menggunakan Nodemailer, membatasi timeout, mempertahankan validasi sertifikat TLS, dan tidak mencatat token/credential/password. `verificationEmailSent=true` berarti server SMTP menerima pesan; penerimaan inbox penerima tetap ditentukan provider.

Resend dibatasi satu request per 60 detik per email dalam satu proses backend, termasuk request bersamaan. Penyimpanan limiter dibatasi 1000 email. Restart menghapus cooldown; deployment beberapa instance membutuhkan limiter bersama.

Pada sesi TUGAS 4, SMTP produksi, `MAIL_FROM`, `EMAIL_VERIFICATION_SECRET`, `EMAIL_VERIFICATION_URL`, dan `JWT_SECRET` belum tersedia. Tidak ada email ke penerima sungguhan yang dikirim. Pengujian menggunakan secret sementara dan SMTP lokal yang hanya menyimpan pesan dalam memori; `.env` tidak diubah.

## Pengujian

Dari folder `backend/`:

```powershell
npm.cmd run build
node test/run-registration-tests.cjs
```

Tes HTTP mencakup registrasi pending, link email, token valid/invalid/expired, token sesi/purpose salah, verifikasi berulang, resend/cooldown, kegagalan mail, login pending/verified, dan admin.

Tes integrasi MySQL + SMTP lokal memerlukan database dengan schema registrasi yang sudah tersedia. Set `EMAIL_VERIFICATION_TEST_DATABASE_URL` secara eksplisit ke database development yang akan diuji, lalu:

```powershell
node --test test/email-verification.mysql.test.mjs
```

Tes hanya menyisipkan record dengan email acak miliknya dan membersihkan record tersebut. Tidak ada migration atau pengiriman email eksternal pada tes. Instance NestJS memakai konfigurasi test melalui provider override tanpa mengganti `.env`.
