# Admin notification center implementation plan

**Goal:** Redesign the existing admin notification route into a compact operational inbox with correct channels, per-admin read state and safe entity navigation.
**Architecture:** Retain Notification/AdminNotificationRead and delivery producers. Extend the existing operations payload/query backward-compatibly; project only genuine internal events as System. Shared metadata-to-route helper validates exact existing admin routes. Use existing AppSelect, PeriodSelector, Button and informational ConfirmDialog surface for delivery rows without targets.
**Tech stack:** Installed Next 16 / React / TypeScript, Nest / Prisma, CSS Modules, Outfit.
**Spec:** user attachment `738424a8-7c61-4345-8ceb-d8691239ce50/Pasted text.txt`.
**Execution:** User requests direct completion; implement inline in the current workspace and preserve prior changes. No commits, schema changes or business-flow changes.

## Decisions / audit

- Existing System events are reservation-created and member lost-report. Email/WhatsApp rows reflect actual delivery fields; MANUAL is shown as Manual, never falsely sent/pending.
- Reservation/loan/lost/e-book context comes from existing eventKey, not title. Existing e-book detail requires `?jenis=akses|antrean`. Hibah/member routes can be resolved from explicit entity metadata or an exact safe existing admin href; no new event producer is introduced.
- Read state belongs to the current admin, not Notification.readAt (member read state). Add bulk read using the same read table and keep sidebar/topbar synchronized through the existing unread endpoint.
- Additive `summaryCounts` describes the global existing notification pool; preserve search-scoped legacy `counts`. Search/time/category narrow paginated rows. Unread tab count and both shell badges share the same global unread definition.
- Retain the server projection/paginated response; never send full history to the browser. Search and date filtering occur before server pagination, dates use WIB and the displayed row timestamp.
- For old/unknown delivery metadata, show an informational existing dialog rather than fabricate a route. No fake retry or external sends.

## Review focus

- Reject external/protocol-relative/encoded or unknown targets; metadata ID wins over href.
- Mark-read failure retains unread state and prevents accidental navigation; duplicate clicks are locked.
- Read-all excludes deliveries, is per-admin, idempotent, and includes only notifications existing at click time.
- Abort stale filtered requests; avoid initial debounce resetting pagination; hide stale rows while loading.
- Preserve keyboard/row semantics and mobile touch targets; nested controls must not trigger navigation.

## Tasks

- [x] Add failing shared target tests for audited reservation/loan/lost/grant/member/e-book routes, fallback and malicious URLs. Implement shared route/context helper.
- [x] Add failing backend tests for System/Unread categories, WIB range/search before pagination, global counts, metadata, delivery status, per-admin read/all-read and validation/guards. Extend existing operations service/controller/proxy only.
- [x] Implement compact header/search-period toolbar/category count chips, separate channel/read/delivery badges, accessible full-row/card navigation and informational fallback. Reuse single-read and add bulk read UI with pending/error handling. Synchronize shell unread fetch.
- [x] Add frontend helper/interaction tests, then run related suites, TypeScript, changed-file lint and frontend/backend production builds.
- [x] Browser-check 1440/768/390, search/time/custom range, tabs/counts, server pagination, correct detail routes, read persistence/failure/all-read, failed delivery, keyboard, empty/error/retry and stale loads using local fixtures only.
- [x] Independent review, fix evidenced issues, record all files/results, stop owned helpers and report.
