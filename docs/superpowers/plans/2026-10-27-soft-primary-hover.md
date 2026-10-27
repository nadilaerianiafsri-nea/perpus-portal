# Soft Primary Hover Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. Preserve the workspace and the existing behavior.

**Goal:** Navy CTAs hover to a soft light surface with navy text/icons, while preserving logout, semantic buttons and navigation.

**Architecture:** Reuse --button-soft (#EEF0F7) and --button-border (#D5D9E7) for shared primary/back/row-primary hover. Use #E5E7EF for pressed, with an info focus outline. Update only the existing member catalog and native admin submit overrides. Keep geometry and all application logic unchanged.

**Tech Stack:** Next.js 16.3.7, React, CSS Modules, node:test, Chrome CDP.

**Spec:** User attachment 86c9c0bd-6f20-4207-9834-bc6b262e318e/Pasted text.txt.

- [x] Audit shared Button and local overrides; update browser expectations and reproduce the old hover failure.
- [x] Update components/buttons.css plus catalog/MemberCatalogPresentation.module.css and admin/AdminSettings.module.css. Preserve dimensions, semantic colors, selected navigation and the logout exception.
- [x] Run shared browser regression and representative public/member/admin pages at 1440/768/390, including hover, pressed, focus, disabled/loading, borders, keyboard and geometry.
- [x] Run TypeScript, lint, related tests and production build; review changes and close owned test processes.

## Verification

- Browser regression reproduced the old dark hover failure before implementation; final 8/8 shared tests passed. Covers primary/back, legacy accentHover, inverse, row-primary including secondary-based row actions, subtle borders, contrast, pressed/focus, disabled/loading, semantic variants and selected/unselected navigation.
- Production preview with isolated API fixture: 24 route/viewport cases at 1440/768/390 across public collection, member catalog, collection detail/back and loan detail/extension, admin reservation/loan export and book detail/edit back buttons. No dimension changes or page overflow. Screenshots inspected at all three widths.
- Nine additional actual-page checks verified hover borders, navy icons, pressed colors and info keyboard focus at all widths. Keyboard Space opens existing confirmation, Escape cancels, Enter follows Back; no transaction mutation submitted.
- Cross-role browser audit: 41 routes, 50 available navy CTA hover checks, six sidebar desktop/drawer logout cases. No browser runtime exceptions. Disabled auth controls remain disabled when required tokens are absent.
- Hover #EEF0F7 with text #000633: contrast 17.17:1. Focus uses existing info #1FABFF; transitions remain 160ms and buttons do not scale.
- TypeScript, ESLint on changed browser test, 18 related component/presentation tests, production frontend build and git diff whitespace check passed. CSS Modules parsed in the build.
- Independent read-only review found no important issues. No changes to handlers, routes, auth, APIs, backend, database or business logic.
