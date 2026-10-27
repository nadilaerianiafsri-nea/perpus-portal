# Global Navy Button Hover Implementation Plan

> **For agentic workers:** Execute this plan inline with superpowers:executing-plans. Track the checks below; preserve the current workspace and existing business behavior.

**Goal:** Navy CTAs hover within the navy palette with white text/icons across public, member and admin pages.

**Architecture:** Centralize interaction colors in components/buttons.css. Keep legacy accent-hover callers compatible, mark sidebar logout as an explicit exception, and remove the member catalog's local yellow override. Scope interaction fixes to CTAs, preserving navigation and semantic variants.

**Tech Stack:** Next.js 16.3.7, React, TypeScript, CSS Modules, node:test, Chrome CDP.

**Spec:** User attachment 50ae1242-aae9-46d8-8883-8ab8a48873ea/Pasted text.txt.

## Global Constraints

- Navy default #000633; hover #2B3056; white text/icons; navy pressed state.
- Retain yellow accent defaults and the intentional yellow hover on admin/member logout.
- Preserve semantic variants, navigation, badges, handlers, routes, APIs, auth and database.
- Preserve button dimensions; no scale/zoom and no !important.

## Review Focus

- Higher-specificity member catalog variables must not restore yellow hover.
- Legacy accentHover callers must follow primary hover without modifying handlers.
- Disabled/loading states must not acquire hover colors.
- CSS individual scale must not survive transform resets on CTAs.
- Logout and selected navigation must retain their existing independent interaction.

## Tasks

- [x] Audit shared button system and independent public/auth + admin/member local overrides.
- [x] Update shared tokens, primary/back interactions, and explicit logout exception.
- [x] Remove the member catalog's local yellow override; apply the shared interaction tokens to the legacy native admin submit without changing its markup or geometry.
- [x] Add browser regression coverage for variants, hover/pressed/focus/disabled, contrast and layout stability.
- [x] Verify representative routes at 1440/768/390, run TypeScript/lint/related tests/frontend build, review and clean up test processes.

## Verification Results

- Shared browser regression: reproduced failures before the fix, then 8/8 tests passed. Covers primary, legacy accentHover, back, row primary, inverse, semantic/accent/secondary/ghost, logout, selected controls, pressed/focus, disabled/loading, dimensions and scale.
- Production frontend with an isolated API fixture: 18 route/viewport combinations across public catalog, member catalog and loan detail, admin reservations, loans and book detail at 1440/768/390. No page overflow or button dimension changes. Screenshots inspected at all three widths.
- Additional browser audit: 41 public/auth/member/admin routes, 50 available navy CTA hover checks, and six desktop/drawer logout cases. No browser runtime exceptions. Disabled auth actions remain disabled when required tokens are absent.
- Real keyboard checks: Tab focus visible, Space opens the existing loan confirmation, Escape cancels it, Enter follows the back link. No transaction mutation submitted.
- White text on hover #2B3056: contrast 12.65:1.
- `npx.cmd tsc --noEmit`, ESLint on both changed Shell files and the browser test, 18 related component/presentation tests, and `npm.cmd run build` passed. CSS parsed successfully in the production build; no new dependencies.
- Independent read-only final review: no important findings. Routes, handlers, auth, APIs, backend, database and business logic unchanged.
