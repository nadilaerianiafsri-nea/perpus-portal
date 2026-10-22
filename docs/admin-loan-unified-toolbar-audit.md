# Unified admin loan toolbar

This revision replaces the previous independent physical/access toolbars with one global toolbar before both tables. Existing uncommitted detail, API, CSV and button-system changes are preserved.

## Behavior

- One search, member-type selector, period selector and Export CSV trigger.
- One applied `period` filters physical `borrowedAt` and UserEBook `addedAt`, using the existing WIB period helpers. Six presets and draft-range behavior are unchanged.
- Search/member type still use the existing backend query for both datasets. Status/due remain physical-only filters. Short native tooltips identify their context; long explanatory paragraphs are removed.
- Physical backend pagination, KPI totals and the existing maximum 50 displayed accesses are unchanged. Date filtering and export continue to use displayed data.
- E-Book header is immediately followed by the table. The duplicate toolbar, its state, helper text, unused styles and redundant footer note are removed.
- One shared navy/yellow Button opens a compact export menu: Ekspor Buku Fisik / Ekspor E-Book. Empty dataset options are disabled individually; the trigger remains available when either dataset has data. Loading/error/pending search or both-empty results disable the trigger. No downloads occur until a choice is made.
- Existing safe CSV functions are reused. Each chosen export follows its visible dataset and applicable filters, never physical status/due for E-Book. No automatic double downloads.
- Export menu supports Enter/Space, ArrowUp/Down, Home/End, Escape, Tab, focus restoration and native outside dismissal. Mobile DOM focus order is Search → Status → Jenis → Jatuh Tempo → Waktu → Ekspor; desktop grid places Export beside Search. Controls remain 48px.
- Physical Detail/WhatsApp, E-Book Detail, both detail routes and all transaction rules remain unchanged.

## Files changed in this revision

- `admin/AdminLoansPage.tsx`
- `admin/AdminLoanTools.module.css`
- `admin/AdminLoanExportMenu.tsx`
- `admin/AdminLoanExportMenu.module.css`
- `admin/AdminLoansToolbar.test.mjs`
- `docs/admin-loan-unified-toolbar-audit.md`

No backend, database, Prisma, auth, role, API, duration, queue or progress implementation changed in this revision. Backend builds were unnecessary for this frontend-only task; prior backend changes remain in the workspace.

## Verification

- New toolbar tests reproduced two period selectors/missing export menu before implementation, then passed after changes.
- Full frontend unit suite (components/admin/shared/catalog/auth/members): 123 passed, 0 failed/skipped.
- TypeScript `npx.cmd tsc --noEmit`: passed.
- Changed JS/TS ESLint (`AdminLoansPage.tsx`, `AdminLoanExportMenu.tsx`, `AdminLoansToolbar.test.mjs`): passed.
- Final production frontend build: passed, including existing detail routes.
- Actual Chrome checks at 1440/768/390: one set of controls, correct toolbar order, 48px controls, no page overflow, 16px statistics-to-toolbar gap, no leftover E-Book toolbar gap/container.
- All six presets update both datasets; custom empty/reversed dates, unapplied draft, Cancel/Apply, and keyboard behavior pass.
- Status/due affect only physical; search/member type affect both. Physical-empty/access-present and access-empty/physical-present states retain the other table and correct export choice; both-empty disables export.
- Real CSV downloads for each menu choice at all three widths: visible filtered row contents, comma/quote escaping, UTF-8 BOM, no automatic double download.
- Menu Arrow/Home/End/Escape/Tab, disabled-item skipping, focus restoration, outside click and navy/yellow hover pass. Both existing Detail links navigate correctly; test requests are read-only fixtures, without real database transactions or WhatsApp sends.
- Review identified mobile focus-order mismatch; fixed by moving Export after filters in DOM and grid-positioning it on desktop. Re-review found no remaining important issues.

Ignored evidence: `backend/.tmp/loan-toolbar-unit-tests.log`, `loan-toolbar-browser-results.json`, `loan-toolbar-layout-results.json`, screenshots `loan-toolbar-final-{1440,768,390}.png`, export-menu screenshots and downloaded CSV files in `loan-toolbar-downloads-*`.

Broader unrelated lint/backend-suite failures documented in the preceding loan-detail audit were not changed or represented as passing by this revision. No commits made.
