# Admin Overdue Monitoring Implementation Plan

**Goal:** Add `/admin/transaksi/terlambat` with global overdue KPIs, server-side filters/pagination, current-page CSV and existing WhatsApp/detail navigation.
**Architecture:** Extend the existing admin-only `transactions/loans?status=OVERDUE` query backward-compatibly. Share elapsed overdue-day calculation; preserve strict dueAt < now. Use existing page controls and actions, no new detail or notification system.
**Spec:** attachment `8cf6b5cc-c554-444a-97f5-abcd8a6c32c6/Pasted text.txt`.
**Execution:** Direct inline execution authorized by user. No commits or schema changes.

- [x] Pin overdue boundary semantics and bucket ranges with failing tests, then implement shared helper.
- [x] Extend loans query validation, bucket/due-date-WIB range/sort before database pagination. Add global overdue counts only for OVERDUE requests. Test active physical-only, boundaries, combinations, pagination and invalid queries/admin guards.
- [x] Add monitoring page, four StatCards, search/debounce, bucket/member/PeriodSelector/sort, readable table and vertical WhatsApp/Detail actions. Cancel stale requests and disable export during stale/loading/error states. Export shared safe CSV for visible page.
- [x] Add sidebar and Dashboard/insight links. Reuse physical detail with allowlisted source=terlambat back context and overdue day metadata.
- [x] Run frontend/backend related tests, TypeScript/lint and both builds. Browser verify 1440/768/390, direct refresh, active sidebar, filters/custom range/sort/page/CSV, invalid WhatsApp, detail/back, empty/error/retry and keyboard.
- [x] Review, record all changed files and verification, stop.

## Decisions and review focus

- Overdue = physical Loan AKTIF, existing member-role restriction, dueAt strictly before a single captured now. Returned/lost/future/exactly-now excluded. Days use ceil(elapsed/24h), matching member loanState; partial overdue day counts as1. WIB for display, due-date date-only filtering and filename.
- Bucket 1–3 includes elapsed <=3 days; 4–14 >3 and <=14; >14 strictly >14. Boundary tests include exact thresholds and milliseconds beyond.
- Global KPIs independent of table filters. Old `stats` response/old query ordering remain intact; new `overdueStats` exists only for OVERDUE query.
- Filters apply on dueAt in WIB, inclusive dates converted to half-open UTC range; no client-only filtering after pagination.
- WhatsApp uses current manual wa.me helper, with existing project phone-format rule checked before enabling. No automatic external messages or new confirmation when existing flow has none.
- Search stale responses/aborts, zero dataset vs zero filter result, deterministic dueAt+id ordering, CSV formula protection and safe detail return context are required review points.
