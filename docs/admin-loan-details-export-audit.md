# Admin loan details, transaction filtering and CSV audit

## Delivered behavior

Every physical-loan row now has a shared navy Detail text link, including ordinary active loans. Due/overdue rows retain their existing WhatsApp URL, conditional availability, icon, tooltip, accessible name and new-tab behavior; the reminder appearance is neutral/soft. The access table replaces TIPE with AKSI/Detail, retaining five headers/cells and correct loading/empty colspans.

Real read-only routes:

- `/admin/transaksi/peminjaman/[id]` uses the internal Loan ID.
- `/admin/transaksi/peminjaman/e-book/[id]` uses the internal UserEBook access ID, never the book or EBookLoan circulation ID.

Minimal detail header uses existing breadcrumb/title/yellow underline/shared Back. Three cards contain transaction dates/status once, member information once, and book information once. Physical location comes from BookCopy.location and shelf from Book.shelf. E-Book data includes real author, nullable deadline, last-open timestamp and progress, without a redundant type field. Loading, unavailable, retry, invalid ID and missing-record states cannot expose stale detail. No mutation controls are added.

## Added GET endpoints

- `GET /members/admin/transactions/loans/:id` returns `{ loan }` selected by exact ID and physical-book type, including historical status, dates, extension count, member, book/shelf and copy/location.
- `GET /members/admin/transactions/ebook-access/:id` returns `{ access }` selected by exact UserEBook ID and EBOOK type. Nullable endsAt uses the existing list formula: addedAt + accessDurationDays; null means unlimited.

Frontend `/api/members/...` proxies these two exact numeric paths. Existing JWT/admin guards, member mapping, private cache interceptor and cookie forwarding are reused. IDs are validated; unknown rows are 404. No schema, migration, permission, stock, duration, extension, return, queue or progress business logic changed. Existing list queries/calculations remain intact.

## Filters and exports

Existing PeriodSelector transaction mode is reused independently for physical borrowedAt and access addedAt. Both default to Semua Waktu and offer Hari Ini, 7 Hari Terakhir, Bulan Ini, Bulan Lalu, Rentang Tanggal, with WIB calendar boundaries and draft validation/Batal/Terapkan/Escape behavior.

Search and member type retain existing server behavior for both sections. Status and due-date filters retain their existing physical-loan semantics. Date filtering applies to currently displayed rows, preserving the previous architecture; access results retain the existing maximum 50 displayed rows. Captions explain these scopes. Server KPI/page totals are unchanged.

Physical CSV exports only visible member/type/title/book code/borrowed date/due date/status/extensions, matching all applicable active filters. Access CSV is a separate, clearly named file with member/type/title/code/start/end, without a type column. No internal IDs, email, passwords or copy metadata are exported. Reservation export remains current-page and preserves ordering/filter behavior.

All three CSV exports share one encoder/download function reusing the report cell encoder, BOM UTF-8, CRLF, quoting and protection against spreadsheet formulas including leading whitespace. Existing Button/ButtonLink gained optional accentHover appearance. Detail and Export use primary navy/white and yellow/navy hover; no per-page button system was created. Reservation Export is now navy as requested.

## Files changed

- `admin/AdminLoansPage.tsx`
- `admin/AdminLoanTools.module.css`
- `admin/AdminReservationsPage.tsx`
- `admin/adminReservations.ts`
- `admin/transactionCsv.ts`
- `admin/adminLoanExports.ts`
- `admin/adminLoanExports.test.mjs`
- `components/Button.tsx`
- `components/Button.test.mjs`
- `components/buttons.css`
- `members/proxy.ts`
- `members/proxy.loanDetails.test.mjs`
- `admin/AdminLoanDetail.tsx`
- `admin/AdminLoanDetail.module.css`
- `admin/adminLoanDetails.ts`
- `admin/adminLoanDetails.test.mjs`
- `app/admin/transaksi/peminjaman/[id]/page.tsx`
- `app/admin/transaksi/peminjaman/e-book/[id]/page.tsx`
- `backend/src/members/admin-transactions.controller.ts`
- `backend/src/members/admin-transactions.service.ts`
- `backend/src/members/admin-transaction-details.spec.ts`
- `docs/superpowers/plans/2026-10-22-loan-detail-export.md`
- `docs/admin-loan-details-export-audit.md`

## Verification

Passed:

- Browser 1440/768/390: physical/access list and both detail routes, 48px toolbar, 40–44px Detail/Back, readable typography, no page overflow, existing internal table scrolling.
- Active/due/overdue physical Detail; due/overdue WhatsApp preserved; five-column access table with Detail; exact transaction data and unlimited-access case.
- All six time presets on both sections, empty/reversed/valid draft dates, cancel/apply/Escape, Arrow/Enter keyboard interaction and focus restoration.
- Search + status + member + period + due combination: existing query parameters and visible filtered CSV match.
- Retry/error/missing detail, direct route/reload, no duplicated member/title/status, no accidental write requests.
- Actual Chrome downloads for physical, access and reservation CSV, correct filenames and UTF-8 BOM/CRLF; comma/quote/newline/formula unit tests pass.
- Frontend TypeScript; ESLint of all 15 changed/new frontend JS/TS files; 120 frontend unit tests; 33 AppSelect browser tests.
- Frontend production build includes both detail routes. Backend build and scoped type-aware lint of three changed backend files pass.
- 15 focused HTTP tests use real admin/JWT guards and service with only database dependencies mocked; exact IDs/type constraints, malformed IDs/query, 404, unauthenticated/nonadmin rejection, unchanged duration and no writes pass.
- Independent review found no important issues; `git diff --check` passes.

Broader existing checks are **not all green**:

- Full frontend lint reports four unchanged `react-hooks/set-state-in-effect` errors: AdminProfilePage.tsx:68, AdminPublicContentPage.tsx:62, AdminSettingsPage.tsx:113, dminGrantsPage.tsx:117.
- Full backend suite: 12 suites pass, 6 fail; 199 tests pass, 73 fail. Failing suites: auth.registration.spec.ts, login.captcha.spec.ts, email-verification.spec.ts (missing AdminProfileService test provider); members.security.spec.ts (missing EBookCirculationService test provider); input-security.spec.ts (registration fixture rejected); admin-content.security.spec.ts (legacy source fixture rejected before intended assertion). These test files and related production files are unchanged against HEAD `9a6ccefe92a59230d7a829c6f5e52edb1831baf5`; no unrelated fixes were introduced.

Ignored verification evidence: `backend/.tmp/loan-final-unit-tests.log`, `loan-final-select-browser.log`, `loan-final-browser-results.json`, `loan-download-results.json`, `loan-final-full-lint.log`, `admin-transaction-details-{focused,all}-results.json`, and matching build/lint/HEAD-audit logs. Focused backend runner: from backend, `node --experimental-vm-modules .tmp/admin-transaction-details-jest.cjs focused`; full suite uses `all`. Native ESM Jest settings are local verification helpers, not production config changes.

UI checks used a local fixture without real database transactions or WhatsApp sends. Prior changes were preserved and no commits made.
