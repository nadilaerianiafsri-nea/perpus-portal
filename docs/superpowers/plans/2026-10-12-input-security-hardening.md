# Input security hardening

**Goal:** Validate every existing public, member and admin input at the backend boundary; preserve ordinary text, passwords, authorization and current library rules.

**Architecture:** Shared parser-backed plain-text validation and URL policy, explicit endpoint schemas, bounded transport and secure output encoding. Existing Prisma, JWT/role guards and ownership predicates remain authoritative. No database schema or migration changes.

**Tech stack:** Next.js 16, React 19, NestJS 12, Prisma/MySQL, htmlparser2, node:test and Jest.

**Specification:** User attachment `54263b8d-5257-497d-b007-26f33c246c63/Pasted text.txt`. Public/auth, member and admin inputs are independent work areas; shared validation/transport/headers and final verification belong to the root agent.

## Tasks

- [x] Inventory existing routes, bodies, queries, uploads and render paths.
- [x] Reproduce HTML, unknown-key, type and query-array failures with focused regression tests.
- [x] Add shared `containsHtml`, `textInputError`, `isSafeUrl`, `escapeHtml`; keep passwords outside plain-text validation.
- [x] Apply explicit schemas to public/auth inputs and frontend feedback.
- [x] Apply member/admin-member schemas and verify ownership, roles and bodyless actions with existing services/guards and scoped in-memory fixtures.
- [x] Apply admin collection/grant schemas and upload constraints.
- [x] Harden request sizes, sensitive endpoint rates, origins and compatible security headers.
- [x] Audit React rendering, email encoding, logging and parameterized SQL; pin adapter to patched MariaDB connector.
- [x] Run shared/frontend/backend tests, TypeScript, changed-file lint and both builds.
- [x] Record route coverage, evidence and remaining concrete deployment limitations in `docs/security/input-audit-2026-10-12.md`.
- [ ] Complete opt-in live MySQL security integration when MySQL80 is running; currently unavailable because the service is stopped and Windows permissions prevent starting it.

## Review focus

No trimming/HTML stripping of passwords; no SQL execution from test payloads; no user HTML rendering; no unrestricted user URLs; no mass assignment; no bypass of ownership/role checks; CAPTCHA, 24-hour reservations, 7-day loans/extensions, reminders and existing flows remain intact.
