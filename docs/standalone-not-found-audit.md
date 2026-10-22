# Route 404 Standalone — 22 Oktober 2026

## Root change

Boundary not-found sebelumnya dirender di bawah layout yang langsung memasang AdminShell/MemberShell. Mengubah tinggi konten tidak dapat mengeluarkannya dari shell tersebut.

Guard auth dan redirect tetap berada di `app/admin/layout.tsx` serta `app/dashboard/layout.tsx`, dengan kondisi existing yang sama. Layout kini mengembalikan children. Shell dipasang oleh layout `(shell)` khusus konten yang memiliki route valid. Catch-all serta boundary not-found berada di luar group tersebut, sehingga shell tidak pernah dimount pada route invalid. Tidak memakai CSS untuk menyembunyikan sidebar, portal, middleware, redirect hack, atau fitur Next experimental.

Route groups tidak masuk URL. Seluruh **93 URL** pada manifest sebelum/sesudah build identik. Dari 48 file yang dipindahkan, 47 byte-identik; satu boundary resource anggota diperbarui agar eksplisit menggunakan mode resource.

## Tampilan dan context

- Semua route 404: satu main, min-height 100dvh dengan fallback 100vh, full width, latar neutral, tanpa dashboard card/border/shadow, tanpa sidebar/topbar/breadcrumb/search/notifikasi/avatar/footer.
- Wrapper maksimal 1240px, dua kolom desktop; ilustrasi di atas dan komposisi terpusat pada tablet/mobile. Ukuran angka 120px desktop dan 72px mobile; headline 40/32/28px sesuai breakpoint.
- Asset buku/kaca pembesar existing tetap digunakan via Next Image, tidak distorsi. Outfit, navy, garis kuning 80x4 dan shared Button tetap digunakan; tombol 44px, primary navy -> kuning saat hover.
- Public CTA `/`, Admin CTA `/admin`, Anggota CTA `/dashboard`. Kedua area terlindungi tetap melewati guard auth existing.
- Kembali tetap menggunakan safe same-origin history existing; direct visit atau browser tanpa Navigation API memakai fallback context.

## Data 404 dan API error

Route valid `/admin/transaksi/e-book/999999?jenis=akses` tetap merender state record tidak ditemukan dalam AdminShell. API500/network error tetap error + Coba Lagi dalam shell; retry dapat pulih menjadi detail. Tidak mengubah komponen detail, endpoint atau aturan sirkulasi.

Boundary resource Koleksi anggota berada di dalam `(shell)` dan memakai `standalone={false}` sehingga tetap dalam MemberShell. Koleksi public yang tidak tersedia memakai CatalogShell dan wording resource; wrapper mengikuti lebar katalog dan membatasi pseudo-element dekoratif agar tidak menyebabkan overflow. Pembatasan ini tidak menyembunyikan shell.

## File diedit/ditambahkan

- `app/admin/layout.tsx`
- `app/dashboard/layout.tsx`
- `app/admin/(shell)/layout.tsx` (baru)
- `app/dashboard/(shell)/layout.tsx` (baru)
- `app/admin/[...notFound]/page.tsx` (komentar penjelas)
- `app/dashboard/[...notFound]/page.tsx` (komentar penjelas)
- `app/koleksi/[id]/not-found.tsx`
- `app/dashboard/(shell)/koleksi/[id]/not-found.tsx` (dipindahkan + mode resource)
- `components/NotFoundState.tsx`
- `components/NotFoundState.module.css`
- `components/NotFoundState.test.mjs`
- `components/NotFoundState.browser.test.mjs`
- `docs/custom-not-found-audit.md` (rujukan revisi)
- `docs/superpowers/plans/2026-10-22-standalone-not-found.md`
- Dokumen audit ini.

`app/not-found.tsx`, boundary Admin/Anggota, root layout/font, shared Button/BackButton, komponen shell, auth service, API/backend/database tidak diedit.

## Seluruh file dipindahkan

Pemindahan mekanis ke group URL-neutral; tidak ada route bisnis dihapus. Git dapat menampilkan lokasi lama sebagai deleted dan group baru sebagai untracked sebelum staging; file tetap tersedia pada tujuan di bawah.

| Sebelum | Sesudah |
| --- | --- |
| `app/admin/faq/page.tsx` | `app/admin/(shell)/faq/page.tsx` |
| `app/admin/hibah-buku/page.tsx` | `app/admin/(shell)/hibah-buku/page.tsx` |
| `app/admin/hibah-buku/tambah/page.tsx` | `app/admin/(shell)/hibah-buku/tambah/page.tsx` |
| `app/admin/hibah-buku/[id]/page.tsx` | `app/admin/(shell)/hibah-buku/[id]/page.tsx` |
| `app/admin/hibah-buku/[id]/edit/page.tsx` | `app/admin/(shell)/hibah-buku/[id]/edit/page.tsx` |
| `app/admin/keanggotaan/page.tsx` | `app/admin/(shell)/keanggotaan/page.tsx` |
| `app/admin/keanggotaan/[id]/page.tsx` | `app/admin/(shell)/keanggotaan/[id]/page.tsx` |
| `app/admin/keanggotaan/[id]/edit/page.tsx` | `app/admin/(shell)/keanggotaan/[id]/edit/page.tsx` |
| `app/admin/koleksi/data-buku/page.tsx` | `app/admin/(shell)/koleksi/data-buku/page.tsx` |
| `app/admin/koleksi/data-buku/tambah/page.tsx` | `app/admin/(shell)/koleksi/data-buku/tambah/page.tsx` |
| `app/admin/koleksi/data-buku/[id]/page.tsx` | `app/admin/(shell)/koleksi/data-buku/[id]/page.tsx` |
| `app/admin/koleksi/data-buku/[id]/edit/page.tsx` | `app/admin/(shell)/koleksi/data-buku/[id]/edit/page.tsx` |
| `app/admin/koleksi/e-book/page.tsx` | `app/admin/(shell)/koleksi/e-book/page.tsx` |
| `app/admin/koleksi/e-book/tambah/page.tsx` | `app/admin/(shell)/koleksi/e-book/tambah/page.tsx` |
| `app/admin/koleksi/e-book/[id]/page.tsx` | `app/admin/(shell)/koleksi/e-book/[id]/page.tsx` |
| `app/admin/koleksi/e-book/[id]/edit/page.tsx` | `app/admin/(shell)/koleksi/e-book/[id]/edit/page.tsx` |
| `app/admin/kontak/page.tsx` | `app/admin/(shell)/kontak/page.tsx` |
| `app/admin/laporan/page.tsx` | `app/admin/(shell)/laporan/page.tsx` |
| `app/admin/notifikasi/page.tsx` | `app/admin/(shell)/notifikasi/page.tsx` |
| `app/admin/panduan/page.tsx` | `app/admin/(shell)/panduan/page.tsx` |
| `app/admin/pengaturan/page.tsx` | `app/admin/(shell)/pengaturan/page.tsx` |
| `app/admin/profil/page.tsx` | `app/admin/(shell)/profil/page.tsx` |
| `app/admin/transaksi/page.tsx` | `app/admin/(shell)/transaksi/page.tsx` |
| `app/admin/transaksi/buku-hilang-penggantian/page.tsx` | `app/admin/(shell)/transaksi/buku-hilang-penggantian/page.tsx` |
| `app/admin/transaksi/buku-hilang-penggantian/[id]/page.tsx` | `app/admin/(shell)/transaksi/buku-hilang-penggantian/[id]/page.tsx` |
| `app/admin/transaksi/e-book/page.tsx` | `app/admin/(shell)/transaksi/e-book/page.tsx` |
| `app/admin/transaksi/e-book/[id]/page.tsx` | `app/admin/(shell)/transaksi/e-book/[id]/page.tsx` |
| `app/admin/transaksi/peminjaman/page.tsx` | `app/admin/(shell)/transaksi/peminjaman/page.tsx` |
| `app/admin/transaksi/peminjaman/e-book/[id]/page.tsx` | `app/admin/(shell)/transaksi/peminjaman/e-book/[id]/page.tsx` |
| `app/admin/transaksi/peminjaman/[id]/page.tsx` | `app/admin/(shell)/transaksi/peminjaman/[id]/page.tsx` |
| `app/admin/transaksi/pengembalian/page.tsx` | `app/admin/(shell)/transaksi/pengembalian/page.tsx` |
| `app/admin/transaksi/reservasi/page.tsx` | `app/admin/(shell)/transaksi/reservasi/page.tsx` |
| `app/admin/transaksi/reservasi/[id]/page.tsx` | `app/admin/(shell)/transaksi/reservasi/[id]/page.tsx` |
| `app/admin/page.tsx` | `app/admin/(shell)/page.tsx` |
| `app/dashboard/e-book/page.tsx` | `app/dashboard/(shell)/e-book/page.tsx` |
| `app/dashboard/koleksi/page.tsx` | `app/dashboard/(shell)/koleksi/page.tsx` |
| `app/dashboard/koleksi/[id]/loading.tsx` | `app/dashboard/(shell)/koleksi/[id]/loading.tsx` |
| `app/dashboard/koleksi/[id]/not-found.tsx` | `app/dashboard/(shell)/koleksi/[id]/not-found.tsx` |
| `app/dashboard/koleksi/[id]/page.tsx` | `app/dashboard/(shell)/koleksi/[id]/page.tsx` |
| `app/dashboard/notifikasi/page.tsx` | `app/dashboard/(shell)/notifikasi/page.tsx` |
| `app/dashboard/pinjaman/page.tsx` | `app/dashboard/(shell)/pinjaman/page.tsx` |
| `app/dashboard/pinjaman/[id]/page.tsx` | `app/dashboard/(shell)/pinjaman/[id]/page.tsx` |
| `app/dashboard/profil/page.tsx` | `app/dashboard/(shell)/profil/page.tsx` |
| `app/dashboard/reservasi/page.tsx` | `app/dashboard/(shell)/reservasi/page.tsx` |
| `app/dashboard/riwayat/page.tsx` | `app/dashboard/(shell)/riwayat/page.tsx` |
| `app/dashboard/error.tsx` | `app/dashboard/(shell)/error.tsx` |
| `app/dashboard/loading.tsx` | `app/dashboard/(shell)/loading.tsx` |
| `app/dashboard/page.tsx` | `app/dashboard/(shell)/page.tsx` |

## Verifikasi

- Browser production preview, fixture API read-only terisolasi: 30 kombinasi route/context/viewport 1440/768/390, gambar termuat, Outfit, light appearance saat system dark, no horizontal overflow, satu main/h1, dua CTA dan focus terlihat.
- Route invalid meliputi `/route-tidak-ada`, `/admin/route-tidak-ada`, `/admin/transaksi/44`, `/admin/transaksi/route-tidak-ada`, `/dashboard/route-tidak-ada`, serta invalid dynamic parameter Admin.
- Route 404 diverifikasi tidak memiliki elemen shell di DOM, wrapper memenuhi viewport dan tidak memiliki border/shadow dashboard.
- Navigasi lewat Next Link ke halaman valid lalu history client kembali ke 404 diuji: shell valid dipasang dan dilepas dengan benar. Direct navigation, keyboard Enter, hover, history/fallback semua context termasuk browser tanpa Navigation API diuji.
- Halaman valid `/admin`, `/admin/koleksi/data-buku`, Reservasi, Peminjaman, `/dashboard`, Pinjaman Saya dan Detail Pinjaman tetap memakai shell existing.
- Resource Koleksi public/anggota dan API404 sirkulasi tetap kontekstual. API500 public/Admin, network error Admin dan retry detail diperiksa terpisah dari route404.
- Unit suite: 147 test lulus; satu browser suite opt-in dilewati pada unit run dan dijalankan terpisah. Enam test Not Found lulus.
- TypeScript, lint file perubahan, build frontend dan diff whitespace check lulus. Manifest URL identik dan hash file relokasi diperiksa.
- Review independen tidak menemukan masalah actionable.

Artefak lokal: `backend/.tmp/standalone-not-found/*.png`, `results.json`; log `standalone-build.log`, `standalone-unit.log`, `standalone-browser.log`; snapshot `standalone-moves.json` dan `standalone-before-route-manifest.json`. Tidak masuk source produksi. Browser suite menutup preview/fixture/Chrome miliknya sendiri.

Jalankan ulang:

```powershell
npm.cmd run build
$env:NOT_FOUND_BROWSER_TEST='1'
$env:NOT_FOUND_SCREENSHOTS='backend/.tmp/standalone-not-found'
node --test components/NotFoundState.browser.test.mjs
```

API, backend, database, auth conditions, roles, business logic, menu dan tampilan shell halaman valid tidak diubah. Pengujian memakai fixture memori tanpa transaksi/database/SMTP pengguna.
