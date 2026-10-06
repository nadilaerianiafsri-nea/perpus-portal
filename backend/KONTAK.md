# Kontak dan informasi layanan

Halaman `/kontak` memakai navbar, footer, breadcrumb, dan state auth existing. Informasi layanan final berasal dari `shared/serviceInfo.cjs`, dipakai oleh landing page, kedua varian footer, halaman Kontak, peta, dan fallback penerima email backend. Folder `shared` perlu disertakan bersama frontend dan backend saat deployment.

## Peta

Embed resmi OpenStreetMap tanpa API key menggunakan marker `0.5210168, 101.447917`. Koordinat adalah pusat bangunan kantor pada [OpenStreetMap way 751217532](https://www.openstreetmap.org/way/751217532), dicocokkan dengan alamat kantor. Tidak ada geocoding saat halaman dirender. Attribution tetap ada dan tautan lokasi membuka OpenStreetMap di tab baru.

## Pengiriman

`POST /api/contact` meneruskan JSON `{ name, email, message }` ke `POST /contact`. Validasi frontend dan DTO backend memakai `shared/contactValidation.cjs`: trim, string wajib, nama maksimal 100, email 254, pesan 3000 karakter, format email dan pencegahan penyisipan header. Pengiriman dibatasi satu percobaan per email selama 60 detik dengan penyimpanan sementara yang terbatas, mengikuti pola auth existing.

ContactModule memakai instance MailService yang diekspor AuthModule. Tidak ada SMTP client/config terpisah dan tidak ada tabel atau migration. Transporter existing menggunakan `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, dan `MAIL_FROM`.

- To: `CONTACT_RECIPIENT_EMAIL`, fallback `serviceInfo.email` (`humaskumriau@gmail.com`). Nilai contoh ditambahkan pada `.env.example`.
- From: `MAIL_FROM`, bukan alamat pengunjung.
- Reply-To: alamat pengunjung yang sudah divalidasi.
- Subject: `Pesan Website Perpustakaan — [Nama Pengirim]`.
- Body: teks dan HTML sederhana berisi nama, email, pesan, serta petunjuk membalas. Input pada HTML di-escape.

Tidak ada salinan otomatis ke pengunjung. Sukses hanya dikembalikan setelah SMTP menerima penerima tujuan. Kegagalan SMTP menghasilkan 503 `CONTACT_SEND_FAILED`; proxy yang tidak dapat menghubungi backend menghasilkan 503 `CONTACT_UNAVAILABLE`. Form menampilkan pesan Indonesia, mempertahankan isian saat gagal, dan dikosongkan saat sukses.

## Verifikasi pengembangan

Pemeriksaan browser 1440px/390px mencakup informasi layanan, marker/zoom/attribution, tel/mailto, validasi field, loading, submit ganda, sukses/reset, kegagalan SMTP/backend/jaringan, serta konsistensi landing/footer. Satu pesan uji dengan nama `Uji Form Kontak Perpustakaan` dan Reply-To `pengujian@example.com` dikirim melalui form ke SMTP remote existing dan diterima untuk tujuan perpustakaan. Penerimaan SMTP tidak menunjukkan folder penempatan inbox/spam; inbox tidak diakses oleh pengujian ini.

SMTP penangkap lokal memverifikasi header/subject/body, HTML escaping, penolakan pengiriman, dan email verifikasi/reset existing. Tes auth existing tetap lolos. Kredensial SMTP dan `.env` tidak ditampilkan maupun diubah.
