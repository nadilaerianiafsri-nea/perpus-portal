# Table and list action buttons

The existing button system now supports a scoped `data-row-action` appearance. Only actions inside table/list records opt in; navigation, page CTAs, statistics, filters and final confirmation buttons retain their existing styles.

## Reusable system

- `components/Button.tsx`: `Button` and `ButtonLink` accept `rowAction`. Existing native buttons and links can use `data-row-action` with `data-button` directly.
- `components/buttons.css`: shared soft semantic tokens, compact dimensions, hover/pressed/focus/disabled states and a loading indicator for square icon actions.
- `components/RowActionTooltip.tsx` and `.module.css`: one lightweight tooltip mounted by `app/layout.tsx`, using each square action's existing title/accessibility label. Works on pointer hover and keyboard focus, supports Escape, and portals outside scrollable table containers. No new dependency.
- `components/Button.test.mjs`: verifies native navigation/mutation semantics, opt-in appearance and disabled loading labels.

| Row appearance | Use |
| --- | --- |
| `neutral` | View, detail, replacement information, mark read |
| `warning` | Edit |
| `success` | Activate, confirm pickup, return |
| `danger-soft` | Deactivate, mark lost, cancel reservation/queue |
| `danger` | Remove an unsaved grant item |
| `info` | Available for row download/export actions; no matching live row action currently exists |
| `primary` | Extend a loan, read/borrow an E-Book, existing transaction reminder |

Colors derive from the existing website palette, using white mixes for soft backgrounds and darker semantic foregrounds. Delete is more pronounced than deactivate while both remain soft. Icons are 18px; square controls are 40px on desktop/tablet and 44px on mobile, with 10px radius. Existing horizontal table scrolling and mobile record layouts remain in place.

## Applied inventory

35 action templates across 15 page/card files were updated. Mapped records can render these templates multiple times.

| Area | Files | Actions |
| --- | --- | --- |
| Public | `app/page.tsx`, `catalog/BookCard.tsx` | Landing collection detail and catalog/list/recommendation detail, including shared member catalog cards |
| Member | `members/LoanCard.tsx`, `members/ReservationCard.tsx` | Loan detail, extension, replacement information, reservation cancellation |
| Member | `members/EBooksPage.tsx`, `members/NotificationsPage.tsx` | Read/return/borrow/cancel/status actions; per-record mark read |
| Admin | `admin/AdminBooksPage.tsx`, `admin/AdminEBooksPage.tsx` | View, edit, activate/deactivate icon actions |
| Admin | `admin/AdminMembersPage.tsx` | Detail, edit, activate/deactivate in desktop and mobile records; existing ButtonLabel reserves pending text width |
| Admin | `admin/AdminGrantsPage.tsx`, `admin/AdminGrantForm.tsx` | View/edit records, remove unsaved item |
| Admin | `admin/AdminReservationsPage.tsx`, `admin/AdminReturnsPage.tsx` | Confirm pickup, return, mark lost |
| Admin | `admin/AdminLoansPage.tsx`, `admin/AdminLostBooksPage.tsx` | Existing WhatsApp reminder and member detail |

Spacing adjustments are limited to action groups in `admin/AdminBooks.module.css`, `admin/AdminMembers.module.css` and `members/Members.module.css`.

## Deliberate exclusions

- Whole-row links in dashboard insights and notifications retain their existing row interaction. Notification “Lihat detail” is an `aria-hidden` visual cue, not another button; the actual mark-read button uses the neutral appearance and retains event propagation protection.
- Ordinary title/cover links, metadata/source links, FAQ disclosures, reader navigation, pagination, filter controls, form submission and page/detail CTAs remain outside this scope.
- Public grants, member history/profile, admin E-Book circulation and other audited sections without record action buttons require no new controls.
- Header download/export controls remain page-level actions; no artificial row export feature was introduced.
- Existing direct E-Book actions retain their own submission flow. Existing ConfirmDialog rules and final confirmation styles were not changed.

## Verification

Browser verification uses the production build with an isolated in-memory API fixture, not database mutations or external messages. It covers public, member and admin record actions at 1440/768/390px, including the existing horizontally scrollable table on mobile. Checks cover color contrast, dimensions, no new page overflow, hover/focus tooltips, native keyboard/link routing, stable loading dimensions, disabled/double-click protection, confirmation cancellation/submission and notification read-button propagation.

Final results:

- 69 page/viewport checks passed: 23 public/member/admin views at all three widths.
- 21 interaction checks passed, plus Space/Enter, focus restoration and stable member-status loading dimensions at each of 1440/768/390px.
- `npx tsc --noEmit` passed; ESLint passed for all changed TSX/test files and the new tooltip component.
- 28 relevant Node tests passed across Button, StatCard, dashboard insights, chart and period suites.
- `npm run build` passed with all 68 static pages generated.
- `git diff --check` passed.

An AST comparison verifies the 15 modified record templates preserve existing hrefs, callbacks, disabled/loading expressions, confirmation props and API/state calls. Backend, API routes, database, auth, StatCard, charts and PeriodSelector were not modified.

## Existing functional observation

Landing sample collection cards still have `href="#"` for “Lihat Detail”. The destination was retained because this task explicitly forbids changing action destinations or unrelated behavior. Public catalog detail links retain their existing real destinations.
