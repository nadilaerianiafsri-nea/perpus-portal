# Area Anggota

`MembersModule` menggunakan cookie `perpus_session`, `JwtAuthGuard`, serta pengecekan role dan `emailVerified` langsung dari database. Anggota adalah `PENGUNJUNG`; jenis anggota existing `UMUM`, `MAHASISWA`, `PEGAWAI` tetap dipakai. Semua respons anggota tidak boleh disimpan di cache.

## API

Prefix anggota: `/members/me`.

| Metode | Path | Respons / body |
| --- | --- | --- |
| GET | `/dashboard` | Ringkasan real: currentUser, stats, activeReservations, nearestDeadlines, alerts, unreadNotifications, reminders |
| GET / PATCH | `/profile` | `{profile}`; PATCH hanya name, whatsapp, address, universityName untuk mahasiswa, workUnit untuk pegawai |
| GET | `/reservations` | `{reservations}` milik sesi |
| POST | `/reservations` | `{bookId}` → `{reservation}` |
| PATCH | `/reservations/:id/cancel` | `{reservation}` |
| GET | `/loans` | `{loans}` aktif |
| GET | `/loans/history` | `{loans}` seluruh riwayat, termasuk aktif |
| POST | `/loans/:id/extend` | `{loan}` |
| GET | `/notifications` | `{notifications}` |
| PATCH | `/notifications/read-all` | `{success: true}` |
| PATCH | `/notifications/:id/read` | `{success: true}` |
| GET / POST | `/ebooks` | GET `{ebooks}`; POST `{bookId}` → `{success: true}` |
| POST | `/ebooks/:bookId/open` | Simpan idempotent dan perbarui lastOpenedAt |

Endpoint petugas hanya menerima sesi `ADMIN` terverifikasi:

- `POST /members/admin/reservations/:id/pickup`
- `POST /members/admin/loans/:id/return`
- `POST /members/admin/loans/:id/lost`

Tidak ada admin UI pada modul ini. ID anggota selalu diambil dari sesi; perubahan role, email, emailVerified, identityNumber atau ID internal melalui profil ditolak.

## Sirkulasi dan konkurensi

Reservasi mengunci baris anggota dan buku di transaksi InnoDB `READ COMMITTED`, lalu mengunci satu `book_copies` TERSEDIA dan melakukan update bersyarat ke DIRESERVASI. Lock anggota mencegah permintaan bersamaan untuk user/buku yang sama. Tidak ada loan sebelum pickup. Timestamp dibuat satu kali: batas reservasi tepat +24 jam.

Cancel, expiry dan pickup mengunci baris reservasi yang sama. Pickup pada atau setelah expiresAt ditolak dan expiry tetap disimpan; tidak ada loan yang dibuat. Pickup valid mengubah copy ke DIPINJAM dan memulai loan +7 hari dari waktu petugas mengonfirmasi.

Extension, return dan lost mengunci baris loan yang sama. Setiap extension menambah +7 hari dari dueAt terakhir, menambah extensionCount dan menyimpan LoanExtension; tidak ada batas jumlah. Return melepas copy ke TERSEDIA; lost membuat copy HILANG supaya tidak tersedia untuk anggota lain. Tidak ada data/tagihan denda uang.

## Expiry dan pengingat

Interval ringan berjalan setiap 30 detik selama backend aktif, dengan `unref` dan pencegahan pekerjaan tumpang tindih dalam proses. Expiry juga dijalankan saat membaca ringkasan, reservasi/notifikasi serta membuat reservasi. Setiap transisi dan notifikasi ditulis dalam transaksi. Tidak ada infrastructure scheduler tambahan.

Tanggal kalender `Asia/Jakarta` menentukan H-1, hari jatuh tempo, H+1, lalu H+3/H+5 dan seterusnya selama loan aktif. Status terlambat memakai timestamp dueAt sebenarnya. Deduplication key mencakup loan, dueAt dan milestone; extension membuat jadwal baru. Notifikasi reservasi hampir berakhir dibuat saat tersisa paling lama 2 jam. Pekerjaan yang tertunda ketika backend mati diproses pada startup untuk milestone hari berjalan; sistem tidak mengirim seluruh milestone historis sekaligus.

Email pengingat memakai `MailService` existing dan konfigurasi SMTP existing (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`). Tidak ada opsi anggota untuk mematikan pengingat. Jika SMTP belum dikonfigurasi, email tetap PENDING dan UI menyatakan menunggu konfigurasi. Jika dikonfigurasi, worker mengklaim email secara atomik sebagai SENDING, lalu menyimpan SENT/emailSentAt bila SMTP menerima atau FAILED bila belum berhasil. FAILED dicoba ulang setelah 15 menit, maksimal 5 percobaan; kegagalan setelah itu perlu tindak lanjut petugas. Worker memproses maksimal 20 email per siklus.

SENDING menggunakan lease 15 menit; pekerjaan yang tertinggal setelah proses mati dipulihkan secara atomik untuk dicoba kembali. Deduplication key dan claim mencegah pekerjaan paralel mengirim reminder yang sama; SMTP tidak menyediakan transaksi lintas database, sehingga crash setelah server menerima pesan tetapi sebelum SENT tersimpan bisa menyebabkan pengiriman ulang. SENT berarti diterima server SMTP, bukan jaminan dibaca atau diterima kotak masuk. Deadline, status loan dan milestone kalender hari berjalan diperiksa kembali di bawah lock sebelum claim, lalu tepat sebelum mengirim. Milestone lama dinonaktifkan untuk email dan WhatsApp supaya aktivasi SMTP setelah beberapa hari tidak mengirim pengingat H-1/hari jatuh tempo yang sudah usang sekaligus. Reminder pending serta antrean WhatsApp manual untuk dueAt lama dibatalkan saat extension atau pengembalian. Pesan yang sudah dikirim sebelum perubahan tenggat tidak dapat ditarik kembali.

WhatsApp belum memiliki integrasi API. Reminder menyimpan `whatsappDelivery = MANUAL`, dan UI menyatakan perlu tindak lanjut manual petugas. Tidak ada klaim WhatsApp terkirim otomatis. WhatsApp wajib tersedia sebelum reservasi; edit profil memvalidasi nomor Indonesia.

## Database dan pemeriksaan

Migration additive: `prisma/migrations/20261006000200_member_area/migration.sql`. Menambah Reservation, Loan, LoanExtension, Notification, UserEBook dan nilai HILANG pada CopyStatus. Semua relasi memakai foreign key; existing User/Book/BookCopy/MemberProfile/BookGrant tetap digunakan.

Jalankan dari `backend`:

```powershell
npx.cmd prisma generate --config prisma7.config.ts
npx.cmd prisma migrate deploy --config prisma7.config.ts
npm.cmd run build
node test/members.mysql.test.mjs
```

Test menggunakan fixture unik `member-test-*` dan email `@example.test`, MailService palsu yang tidak pernah mengirim email, lalu menghapus hanya ID fixture yang dibuatnya. Test menggunakan DATABASE_URL existing, tidak mengubah pengguna/buku asli dan tidak melakukan reset/drop. Mencakup alokasi satu copy untuk dua anggota, reservasi duplikat bersamaan, ownership, expiry, pickup, extension bersamaan, pengembalian/hilang, reminder, perpustakaan ebook, profil dan ringkasan real.
