# Operational List Simplification Implementation Plan

> For agentic workers: execute independent presentation tasks in parallel, then review and verify together. User explicitly requested direct completion; no commits or approval pause.

**Goal:** Admin/member lists show decision-relevant information at readable sizes; existing details retain complete information.

**Architecture:** Keep native tables/cards, routes, handlers and existing button/tooltip components. One opt-in `components/records.css` supplies record typography, desktop fit, mobile scrolling and action sizing. Page-specific modules retain their colors and contextual layouts.

**Tech stack:** Existing Next.js/React, CSS Modules, react-icons, Button and RowActionTooltip.

**Spec:** User attachment `C:/Users/ASUS/.codex/attachments/9dff2751-4768-4a55-9f6d-a4fd66ad2deb/Pasted text.txt`.

## Global constraints

- No backend/API/type/schema/auth/business/transaction changes; preserve callbacks, queries, filters, sorting, pagination, IDs, keys and complete detail screens.
- No public/landing redesign, StatCard/chart/sidebar redesign, dependency addition or commit.
- Body/primary14px; secondary/header/badge12px; text actions14px; native accessible semantics and existing confirmation rules.
- Compact actions retain icons, titles and object-specific aria-labels. Returns actions remain text-only.

## Shared opt-in interface

- `data-record-list` on operational tables; `data-record-scroll` where the existing mobile presentation is a scrolling table.
- `data-record-card` on each operational mobile/member record card.
- `data-record-primary`, `data-record-secondary`, `data-record-badge` on values when semantic tags alone cannot identify hierarchy.
- `data-record-actions="1|2|3|text"` on action-column headers; `data-record-action-group` on the existing action flex group (value `text` for Returns).
- Primary ordinary strong elements and secondary small elements inherit the shared hierarchy. Use existing page CSS for contextual column proportions; avoid changing unrelated detail/form content.

## Review focus

- Very long names/emails/titles wrap or truncate with complete accessible value, and never create desktop record overflow.
- Loading/empty states use the actual remaining column count; data/filter/action lifecycle stays unchanged.
- Mobile cards hide the same secondary metadata as desktop, retain operational statuses and accessible actions.
- Information hidden from the initial list remains in existing Detail where relevant; do not invent statuses or remove the only view of required information.
- Internal IDs never disappear from keys, lookup or payloads. Existing search limitations are documented honestly.

## Tasks

- [x] Shared system + admin notifications/reports/dashboard audit: root owns records.css/root import and these pages. Inspect existing columns/contexts, opt in, reduce only secondary delivery metadata, preserve analytical exceptions.
- [x] Admin catalog/membership/grants: worker owns corresponding page/module files. Members become Name/Type/Contact/Loans/Overdue/Actions; hide account/verification/join-date from both desktop/mobile. Audit books/E-Books/grants; keep detail available.
- [x] Admin transactions: worker owns Reservations/Loans/Returns/LostBooks/EBookCirculation and their modules. Keep operational statuses/deadlines, remove secondary dates/extensions/codes/IDs when the detail/context supports it; fit desktop action columns. Returns stays text-only.
- [x] Member records: worker owns member list/card files/modules. Keep book/deadline/status/actions, progress/access, history outcome and notification summary; simplify secondary metadata while keeping existing detail access.
- [x] Review all worker diffs against preserved behavior and record before/after inventory in `docs/operational-list-audit.md`.
- [x] Verify all affected routes at1440/768/390, long text, no desktop table scroll, mobile containment, header/cell/colSpan alignment, action/tooltip/keyboard/loading, search/filter/pagination request preservation. Use an isolated in-memory fixture.
- [x] Closed owned preview/fixture/browser processes after final checks. TypeScript, changed-file ESLint, 20 relevant tests, build and diff checks passed; before/after inventory and existing circulation-proxy 404 limitation documented in the audit.
