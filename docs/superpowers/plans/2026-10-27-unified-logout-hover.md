# Unified Logout Primary Interaction Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. Preserve existing handlers and workspace changes.

**Goal:** Both sidebar logout buttons use the standard navy/soft primary interaction without a color exception.

**Architecture:** Remove the logout marker and shared yellow exception; remove footer foreground/pressed overrides. Footer CSS retains geometry only. Reserve the shared 1px border and compensate padding by 1px to preserve content coordinates and dimensions.

**Tech Stack:** Next.js 16.3.7, React, CSS Modules, node:test, Chrome CDP.

**Spec:** Attachment 0d700c8e-2448-4cbf-973c-b637f03071b7/Pasted text.txt.

- [x] Audit Button, shared CSS, Shells and footer modules; reproduce yellow-logout test failure and capture original geometry at 1440/768/390.
- [x] Remove shared/local color exceptions and obsolete Shell markers without changing handlers or footer layout.
- [x] Verify admin/member default, hover, pressed, focus, pending, actual logout, keyboard and geometry at all three widths with isolated API fixtures. Recheck other primary and semantic/navigation/accent interactions.
- [x] Run TypeScript, lint changed files, related tests and frontend build; review and close owned test processes.

## Results

- Root cause removed: the shared `[data-button-hover="logout"]` yellow rule, both Shell markers, and both footer foreground/pressed overrides. Footer classes retain layout only; interaction colors, borders and transition come from shared primary.
- Reproduced the old yellow foreground failure before implementation; final shared browser regression 8/8 passed, including an obsolete-marker guard, semantic/accent/navigation variants, pressed/focus, disabled/loading and geometry.
- Recorded original geometry and compared it exactly after the change in six admin/member cases at 1440/768/390: full width, 50px height, 15px radius, 20px icons, 13px gap, left alignment and icon coordinates unchanged. The shared 1px border causes no hover layout shift.
- Actual logout succeeded in all six isolated-fixture cases using Enter, Space and mouse activation. Verified pending neutral colors, info focus, exactly one backend logout request per case, browser session cookie removal and redirect to `/login`. Production handlers and auth code were untouched.
- Rechecked 24 primary route/viewport cases plus a 41-route public/member/admin audit with 76 available navy CTA hover checks. Screenshots inspected, no page overflow or browser runtime exceptions. Remaining yellow candidates are intentional brand/navigation/accent/nonbutton styles or lower-priority legacy CSS; computed primary states remain shared soft/navy.
- Default white/navy contrast 19.56:1; hover navy/soft contrast 17.17:1.
- TypeScript, ESLint on both changed Shells and browser test, 18 related tests, production frontend build and whitespace check passed. CSS Modules parsed in the production build.
- Independent read-only review: no actionable findings. Owned preview/fixture/Chrome processes closed. No changes to routes, APIs, backend, database or business logic.
