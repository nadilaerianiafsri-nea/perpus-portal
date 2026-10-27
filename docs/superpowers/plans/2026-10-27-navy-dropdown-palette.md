# Navy Dropdown Palette Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans. Preserve all data, values, native form bridges and interaction logic.

**Goal:** AppSelect, subject picker and export menu use white/navy/soft-blue states without cream/yellow interaction.

**Architecture:** Centralize --select-* palette tokens in components/selects.css. Remove overriding public year-menu palette declarations, including existing color !important rules. Reuse tokens in custom subject and export CSS, keeping option values, handlers, native bridge, portal/position/max-height logic unchanged. Keep navigation outside this change.

**Tech Stack:** Next.js 16.3.7, React, CSS Modules, node:test, Chrome CDP.

**Spec:** Attachment eddd4c0e-fd53-4187-9eba-84db1cf1cc9d/Pasted text.txt.

- [x] Audit shared select and independent public/admin/member overrides; update real-browser expectations and observe old palette failures.
- [x] Implement tokens and trigger/option/selected/selected-hover/focus/disabled palette; remove public overrides and reuse tokens for searchable subjects and export options.
- [x] Run AppSelect unit and browser contract tests (keyboard/reset/validation/portal/scroll included), verify forms and filters across roles at 1440/768/390.
- [x] Run TypeScript, lint, related regression tests and production build; review, document results and close owned test processes.

**Sizing decision:** Shared trigger remains 48px and options 44px. Bring the custom subject picker to the requested 48px trigger/44px option minimum and standard radii; preserve its widths, list scroll limits, animation and inline positioning. Remove decorative dropdown hover transforms and the undersized public trigger override.

**Ruling from browser evidence:** The public year panel forced to 210px by old !important rules reached x=410.5 on a 390px viewport because it overrode AppSelect's inline 134.5px width. Remove those fixed widths and nowrap constraints so the existing shared positioning/wrapping works correctly; no component positioning logic changes.

## Verification Results

- Shared browser suite: observed old palette failures before implementation, then 36/36 tests passed with real React AppSelect and native form bridge. Covers controlled/uncontrolled values, form submission/reset, native validation, required/error/disabled/loading, keyboard Arrow Up/Down/Enter/Space/Escape/Tab/typeahead, click outside, long-list scroll, dialog portal, mobile flip/clamping and all palette states at 1440/768/390.
- Production frontend with an isolated API fixture: 27 palette/viewport cases across public catalog sort and both year panels, public Hibah, member catalog/filter drawer, admin members/reservations/loans. Verified default/hover/open, selected/selected-hover/checkmark, unchanged hover dimensions, Escape, panel bounds and no clipping. Screenshots inspected at all three widths.
- Nine custom dropdown cases: book and E-Book subject forms plus export menu at all widths. Subject search, controlled selection and Escape work; focus uses info, panel/options use shared tokens. Export menu keyboard focus, hover and Escape work. No data submitted.
- Actual public sort keyboard selection updates its existing query and hidden native value. Member year draft does not update query before Apply; Apply and Clear/Apply preserve the existing query flow.
- Static audit covered public, member/admin forms and filters. No visible native select was replaced; the only active native select remains AppSelect's hidden bridge. Navigation and reader thumbnail controls were preserved. Generic public hover rules exclude AppSelect instead of overriding shared interaction. No new !important rules.
- Lowest tested text contrast (selected-hover/navy): 14.66:1, above AA.
- TypeScript, ESLint on the changed browser test, 27 related tests including AppSelect, production frontend build and whitespace check passed. CSS parsed in the production build.
- Independent final review and incremental review: no actionable issues. Owned preview, fixture and Chrome processes closed. No changes to component logic, values, labels, payloads, API, auth, backend or database.
