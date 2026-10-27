# Member Profile Photo Implementation Plan

> **For agentic workers:** Use parallel bounded backend/frontend implementation per dispatching-parallel-agents, then an independent final review. Root owns frontend/proxy and verification; backend agent owns backend files only. Preserve unrelated changes and all auth/business flows.

**Goal:** Members can preview/upload/replace/remove an optional profile photo, with consistent profile/topbar/right-panel avatars and shared first/last initials.

**Architecture:** Reuse cover-file upload validation (JPG/PNG/WEBP, extension/MIME/signature, 5 MB) and UUID local storage pattern. Add nullable User.profileImageUrl, using private storage/avatars and an authenticated own-photo read endpoint. Photo mutations derive identity from the existing JWT member guard; no userId input. Frontend uses bounded same-origin proxy, strict local avatar reference helper, shared avatar fallback, and existing ConfirmDialog/buttons. Preserve all profile form fields; hide redundant right panel only on /dashboard/profil.

**Contract:** POST /members/me/profile/photo multipart field photo; DELETE same path (empty object/body); returns {profile} including profileImageUrl nullable. GET /members/me/profile/photo/:filename validates UUID.ext and ownership, returns image/nosniff/private cache. DB reference /uploads/avatars/UUID.ext; frontend maps it to /api/members/me/profile/photo/UUID.ext. New UUID on replace avoids stale URLs.

**Storage safety:** Write new file exclusively, serialize DB updates on authenticated user, clean staged file on update failure, clean old valid local reference after commit with failure logging. No destructive migrations or resets. Root audits migration status before deciding to apply the additive migration.

**Tech Stack:** Next.js 16.3.7, React, NestJS 12, Prisma 7/MySQL, existing filesystem upload validation, node:test/Jest, Chrome CDP.

**Spec:** User attachment c48be532-c202-4688-b285-ea52e491902f/Pasted text.txt.

- [x] Audit current profile, avatars, guard/proxy, file validation/storage and schema.
- [ ] Backend tests first: upload/replace/delete/read, MIME/extensions/size/signature/path, auth/ownership, concurrent cleanup and rollback. Implement endpoints, service, nullable schema/additive migration and profile projection; generate Prisma client; backend lint/build/tests.
- [ ] Frontend tests first: initials and safe URL/file validation, proxy security/native upload handling. Implement avatar fallback, photo preview/save/cancel/delete confirmation, state sync, full-width profile-only layout, and preserved form fields.
- [ ] Verify complete photo lifecycle, broken image, invalid inputs/error/retry, immediate topbar/profile/right-panel sync, keyboard and responsive 1440/768/390 with isolated API fixtures.
- [ ] Review additive migration status, run frontend/backend TypeScript/lint/related tests/builds and independent security review. Record migration outcome and close owned test processes.
