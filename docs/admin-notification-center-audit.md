# Admin operational notification center

## Design and filters

- Existing `/admin/notifikasi` route and protected AdminShell retained.
- Removed the permanent technical explanation and failure-summary paragraphs. Header remains minimal, with the existing title accent/breadcrumb.
- Compact search + shared PeriodSelector and five category chips: Semua, Belum Dibaca, Sistem, Email, WhatsApp. Secondary bulk-read action appears only when the API advertises support.
- Desktop/tablet use five columns: notification, recipient/context, channel, status, time. Desktop rows are 82px in the browser fixture. Descriptions clamp to two lines; primary text 14px, secondary/badges 12px, time 13px.
- Read rows remain neutral; unread System rows use a subtle background and 3px accent. Channels and delivery/read statuses have separate badges. WhatsApp MANUAL remains Manual, never falsely marked sent.
- Mobile uses full-width clickable cards and a horizontally scrollable category strip. No document horizontal overflow at 1440/768/390.
- Search covers existing member/contact/transaction/type/book fields plus the notification description. Search, displayed-time WIB range and category are applied on the server projection before pagination. Latest-first sort and the existing 10/20/50 page sizes remain.
- New `summaryCounts` supplies global chip totals; legacy search-scoped `counts` remains compatible. Global unread is the same definition used by the sidebar/topbar endpoint. Filtering does not alter the global unread total.

## Sources, channels and navigation

- Reuses Notification and AdminNotificationRead. No schema or migration, second notification store, producer change, reminder schedule change, or external send.
- Existing internal admin events remain reservation-created and member lost-report. This task does not turn all member notifications into admin unread notifications.
- Email and WhatsApp rows are projected only from actual delivery fields; they never count as unread System notifications.
- Added payload fields `description`, `entityType`, `entityId`, resolved admin `href`, `summaryCounts`, `counts.system`, and `capabilities.markAllRead`. Existing fields remain available.
- Entity IDs come from audited eventKey formats, never notification-title matching. Safe metadata wins over a legacy href. Accepted href fallbacks are exact allowlisted existing admin list/detail routes; absolute, protocol-relative, encoded/traversal and unexpected-query targets are rejected.

| Context | Existing destination |
| --- | --- |
| Reservation | `/admin/transaksi/reservasi/[id]` |
| Physical loan/reminder | `/admin/transaksi/peminjaman/[id]` |
| Lost-book report/case | `/admin/transaksi/buku-hilang-penggantian/[id]` |
| E-book loan/history | `/admin/transaksi/e-book/[id]?jenis=akses` |
| E-book queue | `/admin/transaksi/e-book/[id]?jenis=antrean` |
| Explicit grant metadata / safe legacy grant href | `/admin/hibah-buku/[id]` |
| Explicit member metadata / safe legacy member href | `/admin/keanggotaan/[id]` |

Grant/member notification producers were not invented. Their mapping is supported for explicit metadata or existing safe admin hrefs. Legacy delivery-only rows without a valid target open the existing informational ConfirmDialog surface, with no new detail route and no fake retry action.

## Read state and security

- Full row/card opens by mouse, Enter or Space with focus indication and link/button semantics.
- Unread System rows use the existing single-read PATCH and await successful persistence before navigation. Failed read leaves unread state intact and displays feedback. Read rows and deliveries do not invoke read mutations.
- New `PATCH /members/admin/operations/notifications/read-all` reuses AdminNotificationRead, current authenticated admin, a captured creation-time cutoff and duplicate-safe batches. It does not mutate member `Notification.readAt` or delivery status.
- Added only this exact PATCH path to the existing proxy allowlist. Existing same-origin/session checks, guards and role metadata remain. Extra mutation fields and invalid/repeated/object/unknown query inputs are rejected.
- Pending operations are locked against double submission. Read changes refresh the shared unread endpoint for both shell badges. Older count responses cannot overwrite the latest refresh.
- Fetch cancellation/request keys prevent old filtered results replacing current rows. Initial debounce does not reset pagination when search has not changed.
- No changes to reservation, loan, return, extension, lost-book, grant, E-book or BookCopy business rules.

## Verification

- Frontend/shared suite: **161 passed, 0 failed, 1 existing opt-in 404 browser test skipped**. New route/security/read-flow helpers account for seven tests.
- Backend related suites: **67 passed across 5 suites**: notification center service/HTTP, operations, transaction details and admin lost-book.
- Tests cover audited target mapping (including grant), unsafe/legacy fallbacks, read-before-navigation/failure, delivery separation, global vs legacy scoped counts, period/search/category before pagination, admin-only access and mutation/query validation.
- TypeScript: passed. ESLint for changed frontend JS/TS and backend type-aware lint: passed without warnings. Frontend production build and backend Nest build: passed.
- Chrome with production Next build and the actual compiled operations service backed by an in-memory Prisma fixture: **1440/768/390 passed**. No real database mutation or Email/WhatsApp send occurred.
- Browser exercised: desktop/tablet list and mobile cards; compact typography; no desktop/tablet table overflow or page overflow; full-row click; Enter/Space; informational dialog Escape/focus return; System/Unread/Email/WhatsApp; failed/manual statuses; search/empty search; all/today/custom-date apply/cancel; pagination; read failure; persisted read after refresh; bulk-read including rows beyond the current page; shell count refresh; stale filtered requests and deliberately delayed stale shell count; category-empty/error/retry; canonical reservation/loan/lost/grant/e-book/queue target routes. No runtime exceptions.
- The browser fixture verifies navigation to existing source routes; source-domain behavior remains covered by existing detail/transaction suites. No notification detail route was added.
- Independent read-only review found no functional/security blocker and reran the seven helper tests successfully.
- Additional broad exploratory run included `backend/src/auth/input-security.spec.ts`; its existing registration positive fixture fails current validation. Auth files were confirmed unchanged and were left outside this task. The dedicated related suites above pass.

## All changed files

- `admin/AdminNotificationsPage.tsx`
- `admin/AdminNotifications.module.css`
- `admin/adminNotifications.ts`
- `admin/adminNotifications.test.mjs`
- `admin/adminOperations.ts`
- `admin/AdminShell.tsx`
- `backend/src/members/admin-operations.service.ts`
- `backend/src/members/admin-operations.controller.ts`
- `backend/src/members/admin-operations.validation.ts`
- `backend/src/members/admin-operations.spec.ts`
- `backend/src/members/admin-notification-center.spec.ts`
- `backend/src/members/admin-notification-center.http.spec.ts`
- `members/proxy.ts`
- `shared/adminNotificationTarget.cjs`
- `shared/adminNotificationTarget.d.cts`
- `shared/adminNotificationTarget.test.cjs`
- `docs/superpowers/plans/2026-10-26-admin-notification-center.md`
- `docs/admin-notification-center-audit.md`
