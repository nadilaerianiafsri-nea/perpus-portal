# Member Profile Photo Implementation Plan

> **For agentic workers:** Use parallel bounded backend/frontend implementation per dispatching-parallel-agents, then an independent final review. Root owns frontend/proxy and verification; backend agent owns backend files only. Preserve unrelated changes and all auth/business flows.

**Goal:** Members can preview/upload/replace/remove an optional profile photo, with consistent profile/topbar/right-panel avatars and shared first/last initials.

**Architecture:** Reuse cover-file upload validation (JPG/PNG/WEBP, extension/MIME/signature, 5 MB) and UUID local storage pattern. Add nullable User.profileImageUrl, using private storage/avatars and an authenticated own-photo read endpoint. Photo mutations derive identity from the existing JWT member guard; no userId input. Frontend uses bounded same-origin proxy, strict local avatar reference helper, shared avatar fallback, and existing ConfirmDialog/buttons. Preserve all profile form fields; hide redundant right panel only on /dashboard/profil.

**Contract:** POST /members/me/profile/photo multipart field photo; DELETE same path (empty object/body); returns {profile} including profileImageUrl nullable. GET /members/me/profile/photo/:filename validates UUID.ext and ownership, returns image/nosniff/private cache. DB reference /uploads/avatars/UUID.ext; frontend maps it to /api/members/me/profile/photo/UUID.ext. New UUID on replace avoids stale URLs.

**Storage safety:** Write new file exclusively, serialize DB updates on authenticated user, clean staged file on update failure, clean old valid local reference after commit with failure logging. No destructive migrations or resets. Root audits migration status before deciding to apply the additive migration.

**Tech Stack:** Next.js 16.3.7, React, NestJS 12, Prisma 7/MySQL, existing filesystem upload validation, node:test/Jest, Chrome CDP.

**Spec:** User attachment c48be532-c202-4688-b285-ea52e491902f/Pasted text.txt.

- [x] Audit current profile, avatars, guard/proxy, file validation/storage and schema.
- [x] Backend tests first: upload/replace/delete/read, MIME/extensions/size/signature/path, auth/ownership, concurrent cleanup and rollback. Implement endpoints, service, nullable schema/additive migration and profile projection; generate Prisma client; backend lint/build/tests.
- [x] Frontend tests first: initials and safe URL/file validation, proxy security/native upload handling. Implement avatar fallback, photo preview/save/cancel/delete confirmation, state sync, full-width profile-only layout, and preserved form fields.
- [x] Verify complete photo lifecycle, broken image, invalid inputs/error/retry, immediate topbar/profile/right-panel sync, keyboard and responsive 1440/768/390 with isolated API fixtures.
- [x] Run frontend/backend TypeScript/lint/related tests/builds and independent security review.
- [x] Re-confirm migration against the current live database: the MySQL instance is available again; perpus_db, the nullable column and completed migration were verified. No database creation, reset or import attempted.

## Verification and continuation, 27 October 2026

Existing feature implementation was already in workspace HEAD f6b9bd5 at continuation; no files were reverted. Final review found that the production multipart allowlist omitted the photo endpoint. Added only that endpoint and enabled production HTTP middleware in the photo integration suite. The regression reproduced 415 responses before the fix, then passed. Delete text/plain rejection now correctly expects the middleware's 415.

Browser testing also reproduced a topbar image failing before hydration attached its error listener. The shared avatar now inspects an already completed image in its ref and switches to initials when naturalWidth is zero. Replacement with a new UUID recovers normally. Independent review found no further blockers.

Verified using a production Next preview, real compiled photo storage/service/profile projection, temporary files, and a memory-only database fixture. No real member photos were changed. The backend integration tests use actual JWT/member guards and the production HTTP security middleware.

| Check | Result |
| --- | --- |
| Frontend photo/helper/proxy plus member presentation/loan regressions | 24/24 passed |
| Backend photo, HTTP security, ownership, active-book, reservation, upload validation | 47/47 passed, 6 suites |
| Frontend TypeScript | passed, npx tsc --noEmit |
| Frontend changed-file ESLint | passed |
| Backend changed-file type-aware oxlint | passed |
| Frontend production build | passed |
| Backend build | passed |
| Independent security/code review | upload allowlist blocker fixed; no further findings |
| Git diff whitespace check | passed |

The earlier full backend suite has unrelated baseline failures: 20 suites passed / 6 failed, 265 tests passed / 73 failed. Failures involve missing providers in existing auth/member test setup and outdated registration/E-Book fixtures. Those unrelated tests/business flows were not changed.

### Browser results

- 1440 / 768 / 390: no horizontal overflow, profile avatars 108 / 96 / 84 px, topbar remains 44 px, actions fit, existing readonly fields retained.
- Preview, cancel, JPG upload, WEBP replacement, PNG replacement, delete confirmation/cancel, delete and immediate initials fallback passed.
- Client SVG and oversized file rejection, failed upload/commit rollback, retry, failed delete/retry, broken stored image fallback and recovery passed.
- Profile/topbar/right-panel sync passed. Right panel is hidden only on profile; retained on Summary.
- Keyboard focus-visible and native Enter/Space activation passed. No runtime JavaScript exceptions.
- Owned preview, fixture and Chrome processes were closed after PID/command-line verification; user servers were untouched.
- Evidence: backend/.tmp/profile-photo-browser-results.json, profile-photo-{1440,768,390}.png, profile-photo-uploaded-mobile.png, profile-photo-frontend-tests.log, profile-photo-backend-related.log, profile-photo-frontend-build.log, profile-photo-backend-build.log (ignored test artifacts).

### Database and storage

Migration 20261027100000_add_member_profile_image only adds nullable users.profileImageUrl VARCHAR(255). Existing deploy log records successful application. At final continuation verification, Prisma reported a schema engine error; a direct read-only MariaDB check identified ER_BAD_DB_ERROR for the configured perpus_db at 127.0.0.1:3306. Current live schema therefore could not be reverified. Asked the user for the correct database location/restoration. No destructive operation, database recreation or import was performed.

Storage reuses existing cover validation, 5 MB limit, UUID filenames and local filesystem pattern in backend/storage/avatars. Private image reads require the current member's session and current reference. Old files are removed after commit; staged files are cleaned on failed writes/updates.

### Feature file manifest

Already implemented files, preserved in continuation:

- backend/prisma/schema.prisma
- backend/prisma/migrations/20261027100000_add_member_profile_image/migration.sql
- backend/src/members/members.module.ts
- backend/src/members/members.service.ts
- backend/src/members/profile-photo.controller.ts
- backend/src/members/profile-photo.service.ts
- backend/src/members/profile-photo.storage.ts
- backend/src/members/profile-photo.spec.ts
- shared/memberAvatar.cjs
- shared/memberAvatar.d.cts
- shared/memberAvatar.test.cjs
- members/profilePhotoProxy.ts
- members/profilePhotoProxy.security.test.mjs
- app/api/members/me/profile/photo/route.ts
- app/api/members/me/profile/photo/[filename]/route.ts
- members/MemberAvatar.tsx
- members/MemberAvatar.module.css
- members/MemberAvatar.test.mjs
- members/ProfilePhotoCard.tsx
- members/ProfilePhotoCard.module.css
- members/ProfilePage.tsx
- members/MemberShell.tsx
- members/MemberContext.tsx
- members/MemberRightPanel.tsx
- members/api.ts
- members/types.ts
- members/format.ts
- information/Grants.tsx: one status comparison changed to SUDAH_DIKATALOGKAN with explicit user approval, resolving the unrelated frontend build blocker.

Additional final continuation edits: backend/src/security/http-security.ts, backend/src/members/profile-photo.spec.ts, members/MemberAvatar.tsx, and this report.

## Follow-up: previous errors resolved, 27 October 2026

The user requested fixing the previously reported errors. Rechecked the live Laragon MySQL instance after it became available again: perpus_db exists in C:\laragon\data\mysql-8; users.profileImageUrl is nullable VARCHAR and migration 20261027100000_add_member_profile_image has a finished_at value with no rollback. Prisma migrate status confirms all 9 migrations are up to date. A compiled PrismaService connection and real MembersService.profile projection also passed using read-only queries, without printing member data. No schema/data changes or service restarts were performed in this follow-up.

Reproduced the earlier full-suite failures: 6 failed suites / 73 failed tests. The normal npm test runner additionally failed before executing tests because it transformed NestJS 12 ESM as CommonJS on Node 22. Corrected Jest to use ESM transforms and a shared Jest helper setup, preserving existing path aliases and explicit .js import resolution.

Repaired test setup only: supplied unrelated AdminProfileService/EBookCirculationService injection stubs, updated valid registration fixtures to current NIK/WhatsApp rules, and supplied an existing-supported local source for in-site E-Book validation. SQL-shaped identity preservation is still tested on a student identifier, whose format accepts plain text; NIK constraints remain unchanged. Added a short-NIK rejection case. Fixed mock argument types, nullable-result assertions and upload Buffer typing so full backend TypeScript checking also passes. Production auth, validation and business logic were not changed.

Final follow-up verification:

- npm test -- --runInBand: **26/26 suites, 339/339 tests passed**, using committed Jest configuration (no temporary configuration needed).
- npx tsc --noEmit (backend, including tests/config): passed.
- Type-aware oxlint for changed specs/setup: passed.
- npm run build (backend): passed.
- npx prisma migrate status --config prisma7.config.ts: database schema up to date, 9 migrations.
- Real Prisma connection and member profile projection: passed, read-only.
- Independent review: no actionable findings; reviewer separately verified 128 affected security tests.

Follow-up files: backend/jest.config.ts; backend/test/jest.setup.ts; backend/src/auth/{auth.registration,email-verification,login.captcha,input-security}.spec.ts; backend/src/admin-books/admin-content.security.spec.ts; backend/src/members/{members.security,admin-notification-center,admin-overdue,lost-loan.admin,lost-loan,profile-photo}.spec.ts; this report. All earlier feature/UI changes were retained.

Evidence: backend/.tmp/error-repair-tests.log (red baseline), error-repair-default-runner-red.log, error-repair-green-results.json, error-repair-green.log, error-repair-build.log, error-repair-migration-final.log. Earlier baseline failures and database unavailability described above are historical and now resolved.
