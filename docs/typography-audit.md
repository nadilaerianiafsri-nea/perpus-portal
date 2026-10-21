# Audit typography — 21 Oktober 2026

Typography Tambah/Edit/Detail dan konten Public/Anggota/Admin diselaraskan memakai Outfit existing dan satu skala semantik di `components/typography.css`. Root layout mengimpor file token tersebut; tidak ada `body { font-size: ... }` baru.

## Skala

| Konteks | Skala yang diterapkan |
| --- | --- |
| Page title form/detail utama | 32px desktop, 28px tablet, 26px mobile; 700 / line-height1.2 |
| Judul buku/E-Book pada hero/detail | 28px desktop / 24px mobile |
| Section / subsection | 18px / 16px; 600–700 |
| Form label | 13px / 500–600 |
| Input, select, textarea | 14px; nilai existing yang sudah proporsional dipertahankan |
| Detail label | 13px / 500, slate |
| Detail value | 15px / 500, navy |
| Body / secondary | 14–15px / 13px, line-height1.5 |
| Helper, breadcrumb, badge | 12px; helper line-height1.45 |
| Tombol | 14px / 600; variant/warna/behavior tetap |

Token ukuran dasar: `--text-xs`, `--text-sm`, `--text-base`, `--text-md`, `--text-subsection`, `--text-section`, `--text-page`, `--text-detail-title`. Token semantik: form-label, input, detail-label/value, secondary, helper, body, badge, button, breadcrumb. Warna secondary memakai slate existing `#4B5E8C`; teks inverse/semantic tetap mengikuti permukaannya.

## Hasil utama

- Edit E-Book: label yang terukur10px menjadi13px; input14px; section18px; helper upload12px; toggle title14px. Cover, grid, warna dan tombol existing dipertahankan.
- Detail Buku/E-Book/Anggota/Hibah: label9px menjadi13px dan value12px menjadi15px pada contoh utama. Label/value terpisah4–6px, dengan weight dan line-height yang jelas serta wrapping aman.
- Form Buku/E-Book/Anggota/Hibah, Profil Admin dan Pengaturan: label, input, helper dan responsive title konsisten.
- Public: metadata/card/helper/footer yang terlalu kecil dinaikkan secara proporsional; detail Buku/E-Book memakai label13/value15. Konten informasi, caption dan auth tetap memiliki hierarchy.
- Anggota: profil/edit profil, informasi pinjaman/reservasi/E-Book, reminder, breadcrumb dan mobile override lebih terbaca. Record cards14/12 tetap.
- Reset `font:inherit` memakai `:where` pada shell/Admin transaksi agar tidak menimpa typography input yang lebih spesifik. Focus/hover selector tidak diubah.
- StatCard hanya menaikkan label11→12px. Angka, warna, icon, radius dan layout tidak berubah. Button system hanya memakai token14px/weight600; tidak mengubah variant/action.

## Cakupan halaman

Admin: Dashboard, Data Buku, Detail/Tambah/Edit Buku, Detail/Tambah/Edit E-Book, Detail/Edit Anggota, Detail/Tambah/Edit Hibah, Reservasi, Peminjaman, Pengembalian, Buku Hilang, Notifikasi, Laporan, Profil dan Pengaturan. Sirkulasi E-Book diaudit pada shared typography/search/tab; kontrak tabelnya tetap.

Anggota: Dashboard, detail koleksi fisik/E-Book, katalog/filter, Reservasi, Pinjaman/Riwayat, E-Book, Notifikasi dan Profil/edit profil.

Public: Landing, Koleksi, E-Book, detail fisik/E-Book, Tentang, Panduan, FAQ, Kontak, Hibah, Login/Register dan reader.

## Typography yang sengaja dipertahankan

- Hero Landing dan heading/auth/public yang sudah proporsional tidak dipaksa menjadi ukuran page-title form. Tidak ada redesign hero.
- Input Kontak16px existing tetap karena sudah jelas dan proporsional; label14px. Tidak diperkecil hanya agar semua angka ukuran identik.
- Metadata minor/helper/breadcrumb/badge/chart-axis/table-header12px tetap dibedakan dari informasi utama14–15px.
- Tabel/list memakai sistem existing primary14px dan secondary/header/badge12px. Sebagian deklarasi legacy9–11px masih terdapat di source, tetapi sudah ditimpa shared `records.css`/`buttons.css` pada UI aktif; tidak dibuat redesign tabel. Sweep browser tidak menemukan teks terlihat di bawah12px.
- Dropdown trigger/option14px dan label internal12px tetap memakai `AppSelect`; tidak ada perubahan behavior dropdown.
- Accordion/shared dialog yang sudah terbaca tidak diubah.

## Verifikasi

Browser memakai production preview terisolasi3214, fixture HTTP4321 dan Chrome headless dengan profile khusus. Tidak ada akses DB/SMTP atau perubahan server pengguna3000/3001. Fixture menguji tampilan dan data panjang tanpa mengubah data project.

| Pemeriksaan | Hasil |
| --- | --- |
| Baseline screenshot problem | Browser mengonfirmasi label Edit E-Book10px, label detail9px, value12px sebelum perubahan |
| 1440 / 768 / 390 | 40 route ×3 =120 pemeriksaan;0 horizontal overflow,0 text clipping,0 teks terlihat di bawah12px,0 runtime exception |
| Form utama | Label13/input14 terukur pada Tambah Buku, Edit E-Book, Edit Anggota, Tambah Hibah di ketiga viewport |
| Detail utama | Label13/value15/weight500 terukur pada E-Book dan Anggota |
| Data panjang | 26 pemeriksaan1440/390 untuk judul, nama, email dan deskripsi panjang;0 overflow/clipping |
| Zoom200% | Zoom Chrome asli melalui setting browser2.0, bukan CSS transform;40 route diuji pada window1440 dengan viewport CSS sekitar711px/DPR2;0 overflow/clipping |
| Fokus200% | Enam form: field required dapat difokuskan/di-scroll terlihat dan Tab berpindah normal; tidak melakukan submission |
| TypeScript | `npx.cmd tsc --noEmit` lulus |
| Lint | ESLint file kode yang berubah (`app/layout.tsx`) lulus;33 CSS termasuk token baru berhasil diparse, seluruh token resolve |
| Tes regresi | 80 pass,0 gagal |
| Dropdown regression | 32 skenario perilaku;TAP33 pass termasuk suite,0 gagal/skip |
| Build | `npm.cmd run build` lulus |
| Scope/diff | Hanya typography dan minor wrapping/spacing terverifikasi melalui AST CSS; satu-satunya perubahan kode adalah import CSS root; `git diff --check` lulus |

Data, API/backend/database/schema, auth/role, route, filter, transaksi, handler, form submission, button/dropdown behavior tidak berubah. Tidak ada dependency/font baru.

## File

Shared/root:

- `components/typography.css`
- `app/layout.tsx`
- `components/buttons.css`
- `components/StatCard.module.css`

Admin:

- `admin/Admin.module.css`
- `admin/AdminBooks.module.css`
- `admin/AdminBooksEnhancements.module.css`
- `admin/AdminMembers.module.css`
- `admin/AdminGrants.module.css`
- `admin/AdminProfile.module.css`
- `admin/AdminSettings.module.css`
- `admin/AdminTransactions.module.css`
- `admin/AdminEBookCirculation.module.css`
- `admin/AdminReports.module.css`
- `admin/AdminNotifications.module.css`
- `admin/AdminEnhancements.module.css`
- `admin/AdminDashboardInsights.module.css`
- `admin/TransactionTrendChart.module.css`

Public/catalog/auth:

- `app/globals.css`
- `app/HomeLandingRevision.module.css`
- `catalog/BookDetail.module.css`
- `catalog/EBookDetail.module.css`
- `catalog/Catalog.module.css`
- `catalog/MemberCatalogEnhancements.module.css`
- `catalog/Reader.module.css`
- `information/Information.module.css`
- `information/Contact.module.css`
- `auth/Auth.module.css`
- `auth/RegisterEnhancements.module.css`

Anggota:

- `members/Members.module.css`
- `members/Reservations.module.css`
- `members/Loans.module.css`
- `members/History.module.css`
- `members/EBooks.module.css`

Dokumentasi:

- `docs/typography-audit.md`
- `docs/superpowers/plans/2026-10-21-typography.md`
