# Admin loan detail and export implementation plan

Goal: make physical-loan and UserEBook-access rows open real, minimal detail pages; preserve reminders and existing business rules; add safe current-page CSV and consistent navy export actions.

Architecture: two protected read-only GET details use actual internal Loan/UserEBook IDs, bypassing list pagination and its 50-access cap. A shared detail presentation consumes these DTOs without repeated identities/statuses. PeriodSelector remains the existing transaction-mode implementation. Physical rows use borrowedAt; access rows use addedAt. Separate CSV files represent the two record kinds and use a common encoder/download helper.

1. Backend: tests first, then exact-ID GET loans/:id and ebook-access/:id under existing admin guard/interceptor. Only select useful display fields; compute access endsAt exactly as existing list does. Validate IDs, 404 missing/wrong resource, no writes, no schema changes.
2. Detail routes: validate promised params; read-only loading/error/missing/retry states and aborted/stale request handling. Minimal heading/back plus transaction, member and book sections; each datum once. Physical location is BookCopy.location and shelf is Book.shelf. No invented Book.location or EBookLoan ID.
3. Shared UI/export: optional accent-hover appearance on existing Button/ButtonLink; no per-page button system. Common CSV encoder reuses report cells, guards formulas, BOM/CRLF. Existing reservation export reuses it. Loan CSV files include only useful display columns.
4. List integration: always physical Detail, preserve due/overdue WhatsApp handler/URL; replace access TIPE column with Detail. Compact search/export and existing status/member/due/period controls; page-scoped captions, independent access period based on addedAt. Export only visible rows with active filters.
5. Validate 1440/768/390, all period presets/custom/keyboard, filter combinations and CSV. Confirm real GET routes and states, reminder availability, no redundancy. Run frontend TypeScript/changed-file lint/tests/build and backend tests/lint/build.

Preserve existing workspace. Execute directly without approval checkpoints, commits, real transactions, schema migrations or feature work outside this request. Independent implementation domains: backend GET details; frontend detail routes; list/export integration.
