# Custom Not Found — 22 Oktober 2026

> Catatan ini mendokumentasikan implementasi awal. Revisi terbaru mengubah **route 404 menjadi standalone**, sementara data/resource error tetap kontekstual. Lihat [audit standalone terbaru](standalone-not-found-audit.md) untuk arsitektur, seluruh file dan hasil verifikasi final.

## Tampilan dan navigasi

Halaman 404 menggunakan Outfit, navy, latar light existing, garis kuning dan shared Button/ButtonLink. Desktop memakai dua kolom; layar kecil menempatkan visual di atas teks. Asset existing `/images/ASSET PERPUS/asset buku kaca pembesar.png` dipilih karena sesuai konteks pencarian koleksi dan identitas Riau; dimuat responsif melalui Next Image tanpa asset atau dependency baru.

- Public: satu landmark main, logo kecil, CTA `/`.
- Admin: AdminShell existing, CTA `/admin`.
- Anggota: MemberShell existing, CTA `/dashboard`.
- Koleksi tidak tersedia: wording khusus dan CTA ke katalog masing-masing area.
- Kembali: menggunakan history hanya jika Navigation API mengekspos halaman sebelumnya yang berbeda dan berasal dari origin yang sama. Direct visit/browser tanpa dukungan menggunakan `router.replace` ke tujuan context. Tidak memakai history.length atau referrer sebagai bukti aman.

## Routing

`app/not-found.tsx` menangani URL public yang tidak cocok. Boundary `app/admin/not-found.tsx` dan `app/dashboard/not-found.tsx` menangani notFound di area masing-masing. Catch-all lokal hanya untuk path yang belum cocok dan memanggil notFound agar layout terlindungi existing tetap dirender; route static/dynamic existing tetap lebih spesifik. Tidak ada middleware, redirect global, duplikasi route bisnis atau perubahan konfigurasi Next.

Resource 404 pada katalog memakai komponen sama dengan wording khusus. Detail sirkulasi yang menerima API 404 tetap memakai state data existing dalam shell. API 500 tetap menggunakan error state halaman, bukan Not Found.

## File task ini

Baru:

- `components/NotFoundState.tsx`
- `components/NotFoundState.module.css`
- `components/NotFoundBackButton.tsx`
- `components/notFoundNavigation.ts`
- `components/NotFoundState.test.mjs`
- `components/NotFoundState.browser.test.mjs`
- `app/not-found.tsx`
- `app/admin/not-found.tsx`
- `app/dashboard/not-found.tsx`
- `app/admin/[...notFound]/page.tsx`
- `app/dashboard/[...notFound]/page.tsx`
- Dokumen audit ini.

Diperbarui:

- `app/koleksi/[id]/not-found.tsx`
- `app/dashboard/koleksi/[id]/not-found.tsx`

## Verifikasi

- Next 16.3.7: konvensi Not Found dibaca dari dokumentasi package installed.
- Server dev existing port 3000: `/halaman-yang-tidak-ada` menampilkan custom 404 (HTTP 404); `/koleksi/route-tidak-ada` menampilkan custom resource state. Respons resource yang sudah streaming dapat berstatus HTTP 200 sesuai perilaku Next; UI tetap Not Found.
- Integration browser pada hasil build production: public invalid route, nested koleksi invalid/numeric missing, admin invalid route dan invalid dynamic ID, member invalid route dan numeric missing; 1440/768/390 semua tanpa horizontal overflow, satu main, satu h1 pada state, shell dipertahankan, gambar termuat, font Outfit, light appearance ketika system dark.
- Keyboard Enter mengaktifkan CTA dengan tujuan sesuai context, focus terlihat, primary navy dan hover kuning. History kembali dan fallback direct visit diuji.
- API 404 sirkulasi tetap data state; API 500 koleksi tetap error state. Anonymous admin tetap redirect login melalui guard existing.
- 141 unit tests lulus; browser suite opt-in dijalankan terpisah dan lulus (21 kombinasi route/viewport serta pemeriksaan tambahan).
- TypeScript, ESLint seluruh file TS/TSX/MJS task ini, diff whitespace check dan frontend build lulus.
- Screenshot dan hasil lokal: `backend/.tmp/not-found/`; log build/unit/browser di `backend/.tmp/not-found-*.log` (artefak lokal diabaikan git).

Jalankan ulang integration suite setelah build, melalui PowerShell:

```powershell
npm.cmd run build
$env:NOT_FOUND_BROWSER_TEST='1'
node --test components/NotFoundState.browser.test.mjs
```

Suite membuat dan menutup fixture API read-only, preview Next serta profil Chrome sementara sendiri. Tidak memakai database/SMTP, tidak mengubah auth produksi dan tidak menghentikan server dev pengguna. Untuk Chrome di lokasi lain atur `NOT_FOUND_CHROME`.

Tidak ada perubahan backend, API, auth, roles, database, Prisma atau business logic.
