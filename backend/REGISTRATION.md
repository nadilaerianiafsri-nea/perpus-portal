# Backend pendaftaran anggota

Endpoint existing: `POST /auth/register`. Frontend belum dihubungkan pada TUGAS 2.

Nama request mengikuti form existing:

```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "whatsapp": "081234567890",
  "address": "Pekanbaru",
  "identity": "001234567890",
  "password": "passwordaman",
  "memberType": "umum",
  "consent": true
}
```

`memberType` menerima `umum`, `mahasiswa`, `pegawai` (huruf besar juga diterima) dan disimpan sebagai enum existing `UMUM`, `MAHASISWA`, `PEGAWAI`. Mahasiswa wajib mengirim `university`; pegawai wajib mengirim `division`. Email biasa diperbolehkan. Field khusus jenis anggota lain tidak disimpan. WhatsApp dan identitas harus string, termasuk jika seluruh karakternya angka.

`consent` dan `confirmPassword` opsional untuk kontrak backend; bila dikirim harus `true` dan sesuai password. Keduanya tidak disimpan. Semua field umum wajib; string di-trim kecuali password. Password minimal 8 karakter dan maksimal 72 byte UTF-8 sesuai batas bcrypt. Backend menolak `role`, `emailVerified`, `passwordHash`, dan `id` dari request publik.

HTTP 201:

```json
{
  "message": "Pendaftaran berhasil dan akun menunggu verifikasi email.",
  "data": {
    "id": 1,
    "email": "budi@example.com",
    "memberType": "UMUM",
    "emailVerified": false
  }
}
```

Registrasi tidak membuat session cookie/token. Sejak TUGAS 4, backend mencoba mengirim email verifikasi setelah akun tersimpan dan menyertakan `verificationEmailSent` pada response. Bila SMTP belum tersedia, akun tetap pending dan response menyatakan email belum dapat dikirim. Lihat [EMAIL-VERIFICATION.md](./EMAIL-VERIFICATION.md). Login dan `/auth/me` menolak akun pending dengan HTTP 403. Response tidak menyertakan password, hash, WhatsApp, alamat, atau identitas. Error validasi HTTP 400 berisi `message` dan `errors` per field; email duplikat HTTP 409, termasuk benturan dua request bersamaan.

## Database dan migration

Model `User` existing dipertahankan: nama dan jenis anggota tetap di User. `MemberProfile` menyimpan WhatsApp, alamat, identitas, perguruan tinggi/unit kerja dengan relasi 1:1 melalui `userId` unik. Keduanya disimpan dalam satu Prisma transaction.

- `20261005000100_init_users`: baseline schema User existing, karena repository belum memiliki migration.
- `20261005000200_member_registration`: menambah profil dan `emailVerified`. Akun yang sudah ada tetap dapat login; default akun baru menjadi belum terverifikasi.

Jalankan dari `backend/`, setelah layanan MySQL dan database pada `DATABASE_URL` tersedia:

```powershell
node node_modules/prisma/build/index.js migrate deploy --config prisma7.config.ts
node node_modules/prisma/build/index.js generate --config prisma7.config.ts
npm.cmd run build
```

Jika database target sudah memiliki tabel `users` tetapi belum memiliki history migration, verifikasi kecocokan tabel terhadap baseline sebelum melakukan baselining dengan `migrate resolve`; jangan menjalankan migration pertama di atas tabel yang sudah ada. Tidak ada reset/drop tabel pada migration ini.

Pada sesi TUGAS 2, target `.env` adalah `perpus_db` pada port 3306, tetapi database belum tersedia dan layanan MySQL berhenti. Migration berhasil diuji pada instance MySQL 8.0 sementara, port 3307, database `perpus_registration_test`; migration **belum diterapkan ke database aplikasi**. `.env` tidak diubah. `JWT_SECRET` juga belum tersedia dan perlu diisi untuk menjalankan aplikasi normal.

Prisma Client sekarang dihasilkan di `src/generated/prisma`, sesuai schema dan `rootDir` backend. Seed development menandai akun seed sebagai terverifikasi; seed tidak dijalankan otomatis pada tugas ini.

## Pengujian

```powershell
node test/run-registration-tests.cjs
npm.cmd run build
```

Runner menggunakan opsi ESM melalui CLI karena konfigurasi Jest existing menggunakan CommonJS, sedangkan NestJS 12 memakai ESM. Konfigurasi existing tidak diubah.

Tes penyimpanan nyata hanya boleh dijalankan pada database terisolasi bernama `perpus_registration_test`, dengan migration sudah diterapkan:

```powershell
$env:REGISTRATION_TEST_DATABASE_URL='mysql://root@127.0.0.1:3307/perpus_registration_test'
node --test test/registration.mysql.test.mjs
```

Tes memeriksa HTTP, nilai User/Profile, hash bcrypt, status pending, duplicate/concurrent email, rollback saat profil gagal, serta login member terverifikasi/admin. Tes membuat trigger sementara dan membersihkan hanya record miliknya; jangan menjalankannya pada database aplikasi.

## Tahap berikutnya

Form telah dihubungkan melalui proxy `/api/auth/register` pada TUGAS 3. Backend verifikasi email ditambahkan pada TUGAS 4; konfigurasi SMTP dan secret dijelaskan di [EMAIL-VERIFICATION.md](./EMAIL-VERIFICATION.md). Registrasi tetap tidak otomatis masuk ke dashboard.
