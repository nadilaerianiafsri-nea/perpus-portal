# Admin Reservation Process Implementation Plan

**Goal:** Add a clear Proses flow, CSV export and date ordering to Admin Reservations only.

**Architecture:** Keep the current list API, filters, status rules and pickup POST/ConfirmDialog. A new frontend detail route finds the exact reservation through the existing paginated list API, optionally narrowing by its member's email obtained through the existing member detail API. No backend or schema changes. Sort and export explicitly apply to the displayed page.

**Tech stack:** Existing Next App Router, React, TypeScript, AppSelect, Button and CSS Modules.

## Tasks

- [x] Test then implement `admin/adminReservations.ts`: immutable ordering, safe CSV using the current encoder, exact-ID paginated lookup and error propagation. Tests: `admin/adminReservations.test.mjs`.
- [x] Update `AdminReservationsPage.tsx` and a reservation-only toolbar CSS module: four essential controls, export current rows, Proses link for waiting status, final-state rows remain passive. Keep existing GET/filter/pagination handlers.
- [x] Add `AdminReservationDetail.tsx`, its CSS module and `app/admin/transaksi/reservasi/[id]/page.tsx`. Move the existing pickup handler and ConfirmDialog unchanged; display member/book/deadline/status plus location if available; revalidate on success, no fake success or new status rules.
- [x] Run relevant tests, TypeScript, changed-file lint and production build. Verify list/detail at 1440/768/390, active/final rows, CSV download, date ordering, direct detail reload, confirmation cancellation/pending/failure/success and keyboard navigation using an isolated fixture. Review diff and stop.

No commits or deployment requested. Keep all previous workspace changes.

Verification completed: 8 new tests proved red then green; 88 related frontend tests passed; changed-file ESLint, TypeScript and production build passed. Browser proof covers 1440/768/390, CSV/date order, direct/reloaded detail, original filters, keyboard/back hover, no mutation on cancel, pending/error/success and stale/missing data. Review finding on shared GET/POST error presentation resolved with separate loadError while preserving the original pickup handler and ConfirmDialog exactly.
