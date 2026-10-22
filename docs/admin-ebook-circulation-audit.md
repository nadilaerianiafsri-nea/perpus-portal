# Sirkulasi E-Book admin — 22 Oktober 2026

## Detail dan sumber data

Semua row pada Pinjaman Aktif, Antrean, dan Riwayat kini memiliki tombol teks Detail, memakai shared Button primary navy, hover kuning, tinggi 42px, font 14px semibold. Tidak ada action mutasi baru.

Satu pola halaman dipakai: `/admin/transaksi/e-book/[id]?jenis=akses|antrean`. Parameter jenis wajib; ID invalid atau jenis tidak dikenal menghasilkan not-found. Entity `EBookLoan` dan `EBookQueue` memiliki ID masing-masing sehingga ID angka yang sama tidak boleh dipakai untuk menebak jenis record.

- `jenis=akses`: GET `/api/admin/ebooks/circulation/loans/{id}` untuk akses aktif maupun riwayat. Informasi status, mulai, batas akses, waktu selesai jika tersedia, anggota, dan buku.
- `jenis=antrean`: GET `/api/admin/ebooks/circulation/queues/{id}` untuk antrean. Informasi status, waktu masuk, posisi aktif, serta waktu prioritas/klaim/pembatalan/berakhir hanya jika tersedia. Catatan lisensi ditampilkan jika ada.
- Kedua GET diproksikan ke route NestJS dengan path yang sama tanpa `/api`, di bawah `JwtAuthGuard` dan `AdminRoleGuard` existing. Query menggunakan select minimal dan operasi find/count saja; tidak menjalankan settlement, promosi antrean, atau perubahan akses.
- Posisi antrean dihitung terhadap seluruh antrean aktif buku yang sama, berdasarkan `queuedAt` lalu ID sebagai tie-breaker; tidak terbatas pada halaman atau hasil pencarian. Antrean final tidak diberi posisi aktif palsu.
- Jenis anggota ditambahkan secara backward-compatible pada response list. Tidak menampilkan progres baca karena record sirkulasi ini tidak menyediakan progres yang terikat langsung ke akses tersebut.
- Tombol Kembali memakai variant `back` existing dan kembali ke tab yang sesuai status/jenis record.

## CSV dan filter

Hanya ada satu tombol Ekspor CSV, tinggi 48px pada desktop/tablet/mobile, navy dengan hover kuning. Ekspor mengikuti **tab aktif, pencarian aktif, filter waktu, dan row yang terlihat pada halaman aktif**. Scope halaman juga tercantum pada tooltip tombol dan nama file. Ekspor dinonaktifkan saat memuat, error, pencarian belum selesai debounce, atau hasil kosong.

| Tab | Field filter waktu | Kolom setelah Nama Anggota, Jenis Anggota, Judul E-Book, Kode E-Book |
| --- | --- | --- |
| Pinjaman Aktif | `borrowedAt` | Mulai Akses, Batas Akses, Status |
| Antrean | `queuedAt` | Posisi Antrean, Masuk Antrean, Status |
| Riwayat | `endedAt` | Mulai Akses, Batas Akses, Selesai, Status Akhir |

Encoder dan downloader memakai `transactionCsv` / `downloadTransactionCsv` existing: UTF-8 BOM, escaping koma/kutip/newline, serta perlindungan formula spreadsheet. CSV tidak memasukkan ID internal atau email anggota. Filter kalender tetap berdasarkan WIB dan preset existing dipertahankan. Ringkasan/paging tetap menggunakan metadata server existing; filter waktu tetap menyaring halaman yang sedang dimuat.

AbortController dan request key mencegah respons lama atau pergantian tab/pencarian menghasilkan ekspor data usang.

## Terminologi dan informasi

| Nilai backend | Label UI | Dasar source code |
| --- | --- | --- |
| `AKTIF` | Aktif | Akses berjalan pada EBookLoan. |
| `DIKEMBALIKAN` | Akses Selesai | `EBookCirculationService.returnBook` menyelesaikan akses aktif sebelum dueAt dan mengisi endedAt. Menggantikan “Dikembalikan manual”. |
| `KEDALUWARSA` pada akses | Berakhir Otomatis | Settlement existing mengakhiri akses saat masa akses habis. |
| `MENUNGGU` | Menunggu | Antrean aktif existing. |
| `DITAWARKAN` | Prioritas 24 Jam | Penawaran akses existing dengan batas klaim. |
| `DIKLAIM` pada detail antrean | Akses Diaktifkan | Status antrean yang telah diklaim, bila detail dibuka dari tautan lama. |
| `DIBATALKAN` pada detail antrean | Dibatalkan | Status pembatalan antrean existing. |
| `KEDALUWARSA` pada detail antrean | Antrean Berakhir | Status akhir antrean, dibedakan dari kedaluwarsa akses. |

Nilai database tidak diubah. Status tidak dikenal memakai fallback netral; response detail yang tidak sesuai kontrak ditolak. Riwayat tetap berdasarkan EBookLoan final existing, tidak mencampurkan pembatalan antrean sebagai riwayat akses baru.

- KPI “RIWAYAT PINJAMAN” menjadi “RIWAYAT AKSES”.
- Kolom “HASIL” menjadi “STATUS AKHIR”.
- Helper panjang diganti “Filter berdasarkan waktu mulai akses / masuk antrean / selesai akses.” sesuai tab.
- Info monitoring menjadi satu kalimat soft/compact: “Pantau akses, antrean, dan riwayat anggota yang dikelola otomatis oleh sistem.”

## File yang diubah / ditambahkan

1. `admin/AdminEBookCirculationPage.tsx` — Detail, satu ekspor, tab keyboard, helper dan terminology, perlindungan data usang.
2. `admin/AdminEBookCirculation.module.css` — toolbar responsif, tombol, kolom aksi dan typography; tidak mengubah style global.
3. `admin/AdminEBookCirculationDetail.tsx` — detail read-only, loading/error/retry/not-found; reuse style detail existing.
4. `admin/ebookCirculation.ts` — kontrak record, URL, label, filter tanggal, kolom CSV, loader detail.
5. `admin/ebookCirculation.test.mjs` — isolasi entity, terminology, tanggal WIB, CSV aman dan kontrak/error loader.
6. `admin/ebooksProxy.ts` — allowlist dua namespace GET detail saja.
7. `admin/ebooksProxy.test.mjs` — forwarding cookie dan penolakan method/path lain.
8. `app/admin/transaksi/e-book/[id]/page.tsx` — route detail dengan validasi ID/jenis.
9. `backend/src/admin-ebooks/admin-ebooks.controller.ts` — dua GET detail di bawah guard existing.
10. `backend/src/admin-ebooks/admin-ebooks.service.ts` — baca detail, posisi antrean, tambahan memberType pada list.
11. `backend/src/admin-ebooks/admin-ebooks-circulation.spec.ts` — read-only select, ID, posisi antrean, not-found dan metadata guard/GET.
12. `docs/admin-ebook-circulation-audit.md` — laporan ini.

## Verifikasi

- **1440 / 768 / 390px**: ketiga tab dan detail lulus pengujian browser pada production build lokal. Toolbar mobile tersusun Search → Waktu → Ekspor. Tidak ada overflow horizontal halaman; tabel memakai scroll internal existing.
- Tab keyboard ArrowLeft/Right/Home/End/Space, satu selected tab stop, link Detail/Kembali dengan Enter: lulus. Focus ring dan warna primary/hover tetap memakai shared system.
- Detail membuka entity yang benar, termasuk ID loan/queue yang sama; nama, buku, status, dan tab Kembali sesuai record.
- CSV tab/filter/pencarian, debounce, ekspor halaman pertama 30 row dan halaman berikutnya 2 row, encoding UTF-8 BOM pada file unduhan: lulus.
- Filter Hari Ini menggunakan field tanggal berbeda sesuai tab; pengujian unit juga memverifikasi batas tanggal WIB.
- Loading, error/retry, detail 404, ekspor nonaktif saat error: lulus. Seluruh request fixture tercatat GET saja; tidak ada runtime exception browser.
- TypeScript frontend dan ESLint semua file TS/JS perubahan: lulus.
- Suite frontend: **133/133 lulus**. Backend sirkulasi: **6/6 lulus**. Lint backend file perubahan: lulus tanpa warning.
- Build frontend dan backend: lulus. `git diff --check`: lulus.
- Runner Jest standar repository memiliki konflik CommonJS/ESM dengan NestJS pada Node lokal. Tes backend terkait dijalankan melalui konfigurasi native ESM lokal existing (`backend/.tmp/circulation-detail-jest.cjs`); konfigurasi produksi/dependency tidak diubah.

Fixture browser menggunakan **service backend yang dibuild dengan data memori**, bukan database pengguna. Semua skrip, log, hasil JSON, screenshot dan unduhan pengujian berada di direktori ignored `backend/.tmp/circulation-*`. Tidak ada perubahan auth, permission, schema, database, aturan antrean, durasi akses, progres, atau status transition.
