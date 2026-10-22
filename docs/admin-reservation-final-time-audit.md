# Final reservation flow and transaction time-filter audit

## Result and scope

`/admin/transaksi/reservasi/[id]` remains the single live process/detail route. Actual `MENUNGGU_PENGAMBILAN` (including the derived almost-expired condition) uses Proses; `DIAMBIL`, `KEDALUWARSA`, `DIBATALKAN` and unknown non-actionable values use Detail. Only the waiting enum displays Konfirmasi Pengambilan. Final modes explain their read-only outcome. Remaining time reuses the existing countdown hook and never changes server status.

Proses uses the shared primary ButtonLink with local hover tokens for yellow/navy. Detail uses shared neutral secondary; Back keeps its existing navy/yellow variant. Pickup handler and ConfirmDialog are byte-identical to HEAD after newline normalization.

PeriodSelector now accepts `mode="transaction"`, retaining the original default Dashboard/Laporan contract. Options: Semua Waktu (default), Hari Ini, 7 Hari Terakhir, Bulan Ini, Bulan Lalu, Rentang Tanggal. Seven days means today plus six preceding WIB calendar dates; current month is first day through today; previous month is the full calendar month. Ranges include both WIB date boundaries. Missing/reversed/invalid dates disable Apply. Cancel/Escape retain the applied value; custom editing uses the existing edit control. Keyboard selection, focus restoration and reset were verified.

## Date-source audit

| List | Actual field | Scope |
| --- | --- | --- |
| Reservasi | `createdAt` | Currently loaded page, then period filter and date sort |
| Peminjaman, physical loans | `borrowedAt` | Currently loaded physical-loan page |
| Pengembalian, awaiting return | `borrowedAt` | Currently loaded active-loan page; explicitly labelled as borrowing date, because rows have no returnedAt |
| Sirkulasi E-Book, active | `borrowedAt` | Current active page |
| Sirkulasi E-Book, queue | `queuedAt` | Current queue page |
| Sirkulasi E-Book, history | `endedAt` | Current history page; missing dates excluded only when a period is active |
| Buku Hilang & Penggantian | No report timestamp in response | Unchanged: API only exposes borrowedAt/dueAt, neither represents reporting date |

All-time filtering keeps missing-date records. Period filters apply on the frontend, an option explicitly allowed by this request. Captions state current-page scope; server KPI values and pagination totals remain unchanged. Search/status/member type still use the original server queries. Reservation CSV uses precisely the currently visible filtered/sorted rows, retaining current-page export and spreadsheet-formula protection.

The existing E-Book circulation GET was blocked by the frontend proxy's numeric-only path allowlist. Only exact `GET circulation` was added. Existing backend endpoint, session-cookie forwarding, admin guards, query forwarding and write allowlist remain unchanged. No backend, Prisma, migration, permission or transaction-rule files changed.

## Changed files

- `admin/AdminReservationsPage.tsx`
- `admin/AdminReservationTools.module.css`
- `admin/AdminReservationDetail.tsx`
- `admin/adminReservations.ts`
- `admin/adminReservations.test.mjs`
- `components/PeriodSelector.tsx`
- `shared/transactionPeriod.ts`
- `shared/transactionPeriod.test.mjs`
- `admin/AdminLoansPage.tsx`
- `admin/AdminReturnsPage.tsx`
- `admin/AdminEBookCirculationPage.tsx`
- `admin/AdminTransactionPeriod.module.css`
- `admin/ebooksProxy.ts`
- `admin/ebooksProxy.test.mjs`
- `docs/superpowers/plans/2026-10-22-reservation-final-time.md`
- `docs/admin-reservation-final-time-audit.md`

## Verification

- Frontend TypeScript `npx.cmd tsc --noEmit`: passed.
- ESLint for all 12 changed/new TypeScript/JavaScript implementation and test files: passed.
- Shared/components/auth/admin/catalog unit tests: 101 passed, none failed/skipped.
- AppSelect browser suite: 33 passed, none failed/skipped.
- Production `npm.cmd run build`: passed; reservation detail route included.
- Browser at 1440, 768, 390: reservation list/detail and loans/returns/E-Book filters passed; 48px toolbar controls; 40–44px reservation actions; no page horizontal overflow. Existing internal table scrolling retained.
- Six presets; empty/start-only/end-only/reversed/valid custom range; draft cancel/apply/Escape; keyboard arrows/Enter; focus restoration; current-page CSV/date order: passed.
- Combined search/status/member/time/sort result and existing GET parameters: passed.
- All three E-Book tabs filter their actual timestamps: passed.
- Existing pickup POST: pending lock, cancel without POST, failure/retry surface, success with one POST and live final status, stale-load failure, missing record: passed using a local HTTP fixture, without a real database transaction.
- Pickup handler/ConfirmDialog source equality and no backend/schema diff: passed.
- Independent code review: no actionable findings. `git diff --check`: passed.

Browser evidence is retained in ignored `backend/.tmp/reservation-final-browser-results.json`, `reservation-final-extra-results.json` and the related screenshots. Backend build was unnecessary because backend files were untouched. No changes committed.
