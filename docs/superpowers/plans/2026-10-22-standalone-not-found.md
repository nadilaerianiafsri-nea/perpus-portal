# Standalone Route 404 Implementation Plan

> Execute inline; preserve existing workspace changes. User explicitly requests direct completion.

**Goal:** Invalid Public/Admin/Member routes render a full-screen 404 while valid pages and data errors retain their existing shells.

**Architecture:** Keep auth guards in existing area layouts. Put valid content and shell layouts in URL-neutral `(shell)` route groups. Leave route fallback and not-found outside those groups. Reuse NotFoundState with explicit standalone/contextual presentation.

**Spec:** User attachment `6d027a94-35aa-494a-b784-85e4f9ec7d41/Pasted text.txt`.

**Constraints:** No auth/role/API/backend/database/business rule or valid menu changes. Existing image, font and shared buttons. No CSS shell hiding, redirect workaround or experimental Next config.

- [x] Add regression assertions for standalone main/CTA, separate data state and unchanged auth guard behavior; confirm failures.
- [x] Snapshot route URLs and file hashes. Move valid area files unchanged into `(shell)` using checked workspace paths. Keep fallback boundaries and guards outside shell groups.
- [x] Extract shell rendering into group layouts; reuse guard-resolved user through existing server lookup. Update contextual resource boundary and tests for its new path.
- [x] Make route 404 full viewport, neutral transparent wrapper, max width 1240px, 44px buttons and responsive image/text.
- [x] Run unit/route tests, TypeScript, changed-file lint and build. Compare URL manifest and moved file hashes.
- [x] Browser checks: invalid routes including `/admin/transaksi/44`, valid shells, data 404/API500, direct and client navigation, history/fallback, keyboard and 1440/768/390. Review and report all moved/edited files.

**Review focus:** Auth redirects remain identical; invalid routes contain no shell in DOM; valid routes keep existing URLs/shells; data 404/500 never become route 404; direct visits and older-browser history fallback remain safe.
