# Audit dropdown global — 21 Oktober 2026

Seluruh **29 titik select aktif** memakai satu `components/AppSelect.tsx`, dengan style bersama `components/selects.css`. Tidak ada menu native OS yang dibuka pada UI aktif. Tidak ada dependency, endpoint, backend, database, auth, role, atau aturan validasi yang diubah.

## Inventaris

Jumlah di bawah menghitung titik pemakaian source, bukan pengulangan komponen pada beberapa route.

| Area / file | Pilihan yang dimigrasi | Jumlah |
| --- | --- | ---: |
| `catalog/Catalog.tsx` | Kategori public, jumlah per halaman public, sorting public/anggota | 3 |
| `catalog/Filters.tsx` | Tahun dari/sampai; dipakai public sidebar/dialog dan drawer anggota | 2 |
| `information/Grants.tsx` | Status hibah dan tahun public | 2 |
| `admin/AdminBooksPage.tsx` | Ketersediaan buku | 1 |
| `admin/AdminGrantsPage.tsx` | Status dan tahun hibah | 2 |
| `admin/AdminMembersPage.tsx` | Jenis anggota dan verifikasi | 2 |
| `admin/AdminReservationsPage.tsx` | Status reservasi dan jenis anggota | 2 |
| `admin/AdminLoansPage.tsx` | Status, jenis anggota, jatuh tempo | 3 |
| `admin/AdminReturnsPage.tsx` | Status dan jenis anggota | 2 |
| `admin/AdminLostBooksPage.tsx` | Status, jenis anggota, perpanjangan | 3 |
| `admin/AdminNotificationsPage.tsx` | Jumlah per halaman | 1 |
| `admin/AdminBookForm.tsx` | Subjek/kategori pada Tambah/Edit | 1 |
| `admin/AdminEBookForm.tsx` | Subjek/kategori dan mode akses pada Tambah/Edit | 2 |
| `admin/AdminMemberForm.tsx` | Jenis anggota pada Edit | 1 |
| `admin/AdminGrantForm.tsx` | Status katalogisasi pada Tambah/Edit | 1 |
| `components/PeriodSelector.tsx` | Preset periode Dashboard/Laporan | 1 |
| **Total** | | **29** |

Halaman lain diaudit tanpa menciptakan picker baru. Profil/auth, pengaturan, E-Book anggota, dan sirkulasi E-Book admin memakai input/radio/tab/search yang sudah ada, bukan native select relevan. Sidebar, navbar, account/context menu, autocomplete, tabel, card, chart, dan dialog existing tidak didesain ulang.

## Komponen dan perilaku

- Trigger putih, navy, radius 14px, tinggi minimal 48px, Outfit 14px; label 12px. Ukuran `sm` hanya merapatkan padding/gap untuk pemilih tahun yang sempit.
- Panel putih radius 18px, padding 8px, shadow lembut, jarak 8px dari trigger, maksimum 320px dengan scrollbar internal tipis. Lebar mengikuti trigger dan posisi beradaptasi ke atas/ke dalam viewport.
- Option minimal 44px, selected soft slate + font 600 + `FiCheck` kanan. Hover soft yellow; active keyboard punya outline. `FiChevronDown` berputar ketika terbuka; transisi 160ms dan reduced-motion dihormati.
- Pola select-only combobox/listbox: accessible label, expanded, controls, haspopup, active descendant, option selected/disabled, required, invalid dan describedby. Fokus berada pada trigger, dengan ArrowUp/Down, Home/End, Enter/Space, Escape, Tab, dan type-to-select.
- Klik di luar menutup tanpa mencuri fokus. Pemilihan mengembalikan fokus ke trigger. Opsi aktif di-scroll otomatis; opsi disabled dilewati. Memilih nilai yang sama menutup tanpa memanggil onChange, sehingga pagination/filter tidak di-reset tanpa perubahan.
- Loading bertuliskan `Memuat...`, kosong bertuliskan `Tidak ada pilihan tersedia.`, disabled tidak dapat dibuka, error terhubung ke trigger.
- Portal ditempatkan di dialog/popover pemilik atau body; panel masuk top layer agar tidak terpotong overflow dan tetap interaktif dalam modal.
- Native select **tersembunyi**, `aria-hidden` dan `tabIndex=-1`, hanya menjadi bridge untuk React ChangeEvent asli, name, required, FormData dan reset. Native menu tidak digunakan. Controlled/uncontrolled, nilai awal Edit, opsi async, perubahan opsi, reset dan controlled parent onReset teruji sinkron.
- Callback dan option children pada 28 titik halaman dibandingkan terhadap HEAD dengan TypeScript AST: tidak berubah selain atribut presentasi. Empat preset, choose/createPeriod, draft tanggal, validasi, Batal/Terapkan dan edit rentang pada PeriodSelector dipertahankan.

## Pengecualian audit

Tidak ada native dropdown yang sengaja dipertahankan **pada route aktif**. Bridge form tersembunyi di AppSelect diperlukan untuk mempertahankan integrasi form existing.

`admin/dminGrantsPage.tsx` merupakan salinan legacy tanpa import/route; dua select dalam file nonaktif itu tidak dirender. File tersebut tidak diubah. Route hibah yang aktif mengimpor `admin/AdminGrantsPage.tsx`, yang sudah dimigrasi.

## Verifikasi

Verifikasi browser memakai Chrome headless, production preview terisolasi pada port 3214 dan fixture HTTP pada 4321. API fixture hanya untuk pemeriksaan UI/request; database dan SMTP tidak diakses. Server pengguna 3000/3001 tidak dihentikan/diubah.

| Pemeriksaan | Hasil |
| --- | --- |
| 1440 / 768 / 390 | 21 route × 3 viewport = 63 pemeriksaan; 112 panel terlihat diperiksa; tidak ada horizontal overflow, panel terpotong/keluar viewport, atau runtime exception |
| Integrasi interaksi | 39 pemeriksaan: kategori/sorting public, sorting/draft/apply anggota, Escape dalam drawer, filter anggota admin, draft/apply Data Buku, filter Pengembalian, nilai awal/perubahan form Edit, preset/custom/apply/edit/cancel/fokus periode |
| Komponen browser | 32 skenario perilaku; TAP 33 pass termasuk parent suite, 0 gagal/skip |
| Tes regresi project | 80 pass, 0 gagal; mencakup SSR AppSelect, filter, periode, dashboard, keamanan input dan komponen existing |
| TypeScript | `npx.cmd tsc --noEmit` lulus |
| Lint | ESLint seluruh TSX/CJS/MJS yang berubah lulus |
| Production build | `npm.cmd run build` lulus |
| Source/diff | Callback/opsi terjaga; `git diff --check` lulus; package manifest/lock/backend/schema tidak berubah |

Suite browser permanen: `node --test components/AppSelect.browser.test.mjs`, dengan Chrome khusus `--remote-debugging-port=9350` atau `APP_SELECT_CDP_URL`. Suite membangun fixture sementara menggunakan TypeScript + webpack bawaan Next, tanpa dependency baru, lalu membersihkan server/target/file fixture miliknya.

## File yang berubah

Komponen global dan integrasi:

- `components/AppSelect.tsx`
- `components/selects.css`
- `components/PeriodSelector.tsx`
- `components/PeriodSelector.module.css`
- `app/layout.tsx`

Public/anggota:

- `catalog/Catalog.tsx`
- `catalog/Filters.tsx`
- `catalog/Catalog.module.css`
- `information/Grants.tsx`
- `information/Information.module.css`

Admin:

- `admin/AdminBookForm.tsx`
- `admin/AdminEBookForm.tsx`
- `admin/AdminMemberForm.tsx`
- `admin/AdminGrantForm.tsx`
- `admin/AdminBooksPage.tsx`
- `admin/AdminGrantsPage.tsx`
- `admin/AdminMembersPage.tsx`
- `admin/AdminReservationsPage.tsx`
- `admin/AdminLoansPage.tsx`
- `admin/AdminReturnsPage.tsx`
- `admin/AdminLostBooksPage.tsx`
- `admin/AdminNotificationsPage.tsx`
- `admin/AdminBooks.module.css`
- `admin/AdminBooksEnhancements.module.css`
- `admin/AdminGrants.module.css`
- `admin/AdminMembers.module.css`
- `admin/AdminTransactions.module.css`
- `admin/AdminNotifications.module.css`

Tes/dokumentasi:

- `components/AppSelect.test.mjs`
- `components/AppSelect.browser.test.mjs`
- `catalog/filterOptions.test.cjs` — loader mendukung alias komponen bersama; assertion existing dipertahankan.
- `docs/select-audit.md`
- `docs/superpowers/plans/2026-10-21-global-selects.md`
