# Admin Transaksi > Terlambat — implementation and verification

## Menu and source of truth

- Route: `/admin/transaksi/terlambat`, after Peminjaman and before Pengembalian. Existing AdminShell, protected layout and warning icon from the installed icon set.
- Reuses `GET /members/admin/transactions/loans?status=OVERDUE` through the existing authenticated Next proxy. No new API route, notification system, database model or persisted overdue status.
- Eligibility preserves existing admin loan rules: Loan `AKTIF`, physical book, member role `PENGUNJUNG`, `dueAt < now`. Returned/lost/future/exactly-now loans do not qualify. Pending lost reports retain their existing active-loan treatment.
- Overdue days use the existing member loan convention: ceiling of positive elapsed 24-hour periods. A partially elapsed first day is 1 day. One captured request instant controls backend row days and bucket boundaries.
- WIB/Asia Jakarta is used for displayed dates, date-only filtering and export filenames. A custom date range includes both dates, converted to an inclusive start/exclusive next-midnight UTC query.

## Statistics, filters and actions

- Four global counts: total, 1–3, 4–14, >14 days. Non-overlapping bucket bounds match displayed day counts, including exact 3/14-day boundaries and milliseconds beyond them.
- KPI counts remain global; table search/member/bucket/period filters do not change them. Existing `stats` response behavior remains intact; `overdueStats` and row `overdueDays` are additive for OVERDUE requests.
- Search, member type, bucket and due-date period are applied in the database query before pagination. Sort is dueAt ascending/descending with deterministic ID tie breaking. Default page size is 20.
- Shared AppSelect/PeriodSelector/Button/StatCard components; navy total, two muted warning strengths, muted danger. No new date picker or icon dependency.
- Five columns only: Anggota, Buku, Jatuh Tempo, Terlambat, Aksi. WhatsApp and Detail are stacked, with 44px action targets. Smaller viewports reuse internal table scrolling without shrinking typography.
- WhatsApp validates the existing project phone format, then reuses `whatsappReminderHref`. Invalid/missing numbers disable the action. Existing flow is a manual wa.me link without ConfirmDialog; no automatic message or new confirmation flow was added.
- Detail reuses `/admin/transaksi/peminjaman/[id]`, adds overdue-day information and exact allowlisted `source=terlambat` return context. Other sources fall back to Peminjaman.
- Dashboard overdue KPI and action-required link point to the new menu. Existing notification producers were audited; no relevant admin overdue notification link required modification.
- Search debounce only resets pagination when the committed search changes. Aborted/old responses cannot replace current data. Export is disabled while input/results are stale, loading, failed or empty.
- Distinct global-empty and filter-empty states; loading and retry states are present.

## CSV

- Exports the visible filtered/sorted page using the shared CSV encoder and downloader.
- Nine columns: Nama Anggota, Jenis Anggota, WhatsApp, Judul Buku, Kode Buku, Tanggal Dipinjam, Jatuh Tempo, Hari Terlambat, Jumlah Perpanjangan.
- UTF-8 BOM, comma/quote/newline escaping and spreadsheet formula protection are preserved. No internal IDs, copy IDs or email column.
- Filename: `pinjaman-terlambat-halaman-{page}-{WIB-date}.csv`.

## Verification

- Frontend/shared suite: 154 passed, 0 failed, 1 existing opt-in 404 browser test skipped. Separate real-browser overdue checks ran below.
- Backend related suite: 91 passed across 7 suites, including existing transaction detail, operations, reservations and lost-book coverage.
- Boundary tests: future/exact-now/partial day/1/3/4/14/15 days and threshold milliseconds. Query tests cover WIB range, combined filters, sorting, pagination and global count query scope.
- Security tests: unauthenticated 401, member 403, invalid/duplicate/object/unknown query fields rejected before service work. Existing guards, rate limiting and query validation remain in place.
- Frontend TypeScript and ESLint on changed JS/TS files: passed. Backend type-aware lint on changed files: passed.
- Frontend production build and backend Nest build: passed. Frontend build needed network permission for the project's existing Outfit font download; no font/config workaround was introduced.
- Chrome against production Next build with the actual compiled AdminTransactionsService and an in-memory Prisma fixture: passed at 1440/768/390. No production database was modified or real WhatsApp message sent.
- Fixture: 31 eligible loans, global counts 31 = 27 + 2 + 2, pages 20 + 11; future/returned/lost/e-book/admin-role fixtures excluded.
- Browser checks: direct route/refresh, active sidebar, typography, no page horizontal overflow, stacked 44px actions, search, every bucket, member type, oldest/newest sort, all/today/custom date apply/cancel, pagination, current-page CSV download/BOM/formula escaping, valid/disabled WhatsApp links, detail and return, keyboard Enter/Space/Escape and focus, global/filter empty, error/retry, stale response cancellation and export gating. Mobile search aligns with other controls. No runtime exceptions; fixture recorded only GET monitoring requests.
- Independent review found no functional/security blocker. Its UI feedback (navy total, distinct warning tones, visible panel title and complete default filter label) was applied.

## All changed files

- `admin/AdminOverduePage.tsx`
- `admin/AdminOverdue.module.css`
- `admin/adminOverdue.ts`
- `admin/adminOverdue.test.mjs`
- `admin/AdminShell.tsx`
- `admin/AdminDashboard.tsx`
- `admin/dashboardInsights.ts`
- `admin/AdminDashboardInsights.test.mjs`
- `admin/AdminLoanDetail.tsx`
- `admin/adminLoanDetails.ts`
- `admin/adminLoanDetails.test.mjs`
- `app/admin/(shell)/transaksi/terlambat/page.tsx`
- `app/admin/(shell)/transaksi/peminjaman/[id]/page.tsx`
- `backend/src/members/admin-overdue-query.ts`
- `backend/src/members/admin-overdue.spec.ts`
- `backend/src/members/admin-transactions.controller.ts`
- `backend/src/members/admin-transactions.service.ts`
- `backend/src/members/admin-transaction-details.spec.ts`
- `shared/loanOverdue.cjs`
- `shared/loanOverdue.d.cts`
- `shared/loanOverdue.test.cjs`
- `docs/superpowers/plans/2026-10-26-admin-overdue.md`
- `docs/admin-overdue-audit.md`

No changes to schema, auth/roles, loan duration, extension, return, lost-book, reservation or BookCopy business rules. The backend extension is limited to backward-compatible monitoring query/response support.
