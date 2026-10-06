# Area Anggota Implementation Plan

> **For agentic workers:** Use the execution skills to implement and verify each task. Direct execution is authorized by the supplied specification; no design approval or commits are required.

**Goal:** Complete the protected member area with real circulation, personal library, notifications and profile data.

**Architecture:** Keep existing auth, public catalog and admin UI. Add a Nest members module with transactional circulation and a cookie-authenticated Next proxy. A reusable member layout serves `/dashboard` and its six subpages; `/pengunjung` redirects to it.

**Tech Stack:** Next.js 16, React 19, NestJS, Prisma 7, MySQL, existing React Icons and Outfit.

**Spec:** User attachment `8dabe9a4-9291-46c2-8bca-413883fcaf4b/Pasted text.txt` and Dashboard Anggota screenshot.

## Global Constraints

- Bahasa Indonesia; #000633, #2B3056, #FFD000; existing illustration assets.
- Preserve User, MemberProfile, Book, BookCopy, auth and public pages. Preserve existing UMUM/MAHASISWA/PEGAWAI enum values with appropriate UI labels.
- No reset, destructive database operations, admin UI or monetary fines.
- Reservations lock one available copy for 24 hours; pickup by admin starts a seven-day loan; extensions add seven days without a maximum.
- Reminder schedule: H-1, due day, H+1 and every two days thereafter; WhatsApp pending manual integration must be stated honestly.

## Review Focus

- Concurrent reservations for one copy and concurrent duplicate requests by one member.
- Concurrent expiry/pickup/cancellation and concurrent loan extensions must preserve copy ownership.
- All member reads and mutations enforce current database role and ownership.
- Jakarta calendar dates determine reminder milestones; overdue uses the actual deadline.
- Unauthenticated actions return safely to a local book page after login; mobile and long text never overflow.

### Task 1: Backend and persistence

**Files:** `backend/prisma/schema.prisma`, one additive migration, `backend/src/members/*`, `backend/src/app.module.ts`, existing `backend/src/auth/mail.service.ts`.

**Interfaces:** `/members/me/dashboard` returns `MemberSummary`; profile returns `{profile}`; reservations `{reservations}`; loans and history `{loans}`; notifications `{notifications}`; ebooks `{ebooks}`. Types are defined in `members/types.ts`. Every mutation uses authenticated user identity. POST reservations `{bookId}`; PATCH reservation `/:id/cancel`; POST loan `/:id/extend`; PATCH notifications `/:id/read` and `/read-all`; POST ebooks `{bookId}` and `/:bookId/open`; PATCH profile only name, whatsapp, address and relevant universityName/workUnit. Admin-only backend pickup, return, lost endpoints under `/members/admin`.

- [x] Add Reservation, Loan, LoanExtension, Notification, UserEBook and minimal persisted reminder delivery tracking with foreign keys.
- [x] Use transactions and conditional updates/row locks for allocation, expiry, pickup, extension and return.
- [x] Implement guarded APIs, validation, safe profile selection, real summary and notification events.
- [x] Implement background expiry and persisted reminder deduplication; email uses existing MailService and WhatsApp records pending manual integration.
- [x] Generate Prisma client, build and apply normal migration without resetting existing data.

### Task 2: Member interface

**Files:** `members/*` (except shared `types.ts`), `app/dashboard/*`, `app/pengunjung/page.tsx`.

**Interfaces:** Consume `/api/members/me/*` with shared `members/types.ts`. Server layout authenticates via existing `getCurrentUser`. Existing logout endpoint clears the cookie.

- [x] Build reusable responsive shell, sidebar, topbar and summary matching the screenshot.
- [x] Build reservations with backend deadlines and refresh on expiry, active loans with extension, history filters, personal ebooks, unread notifications and safe profile editing.
- [x] Give every page loading, empty, retry/error states and semantic accessible controls.
- [x] Preserve admin UI; route legacy `/pengunjung` to `/dashboard`.

### Task 3: Catalog and auth integration

**Files:** `members/proxy.ts`, `app/api/members/[...path]/route.ts`, `catalog/BorrowAction.tsx`, `catalog/BookDetail.tsx`, ebook viewer, `auth/Login.tsx` and existing member navigation links.

- [x] Create whitelisted same-origin cookie proxy with no-store responses and safe JSON errors.
- [x] Connect book reservation to accessible confirmation modal and prevent double submission; support safe login return.
- [x] Add personal ebook save/open actions without changing public viewer behavior.
- [x] Send member login/navigation to `/dashboard` while preserving admin route.

### Task 4: Practical verification

**Files:** small backend integration script in `backend/test/`, existing checks; temporary browser artifacts ignored under `backend/.tmp/`.

- [x] Use isolated test members/books, exercise real HTTP and database race/expiry/pickup/extension/ownership/notifications/library/profile, then clean fixtures.
- [x] Verify auth and public regression checks, frontend TypeScript/scoped lint and backend build/startup.
- [x] Check actual browser at 1440 and 390 pixels, login/search/modal/countdown/logout and all member pages.
- [x] Review final changes, fix material issues and deliver brief Indonesian report, then stop.

