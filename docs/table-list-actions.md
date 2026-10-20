# Table and list action buttons

The existing button system supports a scoped `data-row-action` appearance. Compact table/list record actions use icons only, with `data-button-shape="square"`, a tooltip title and an object-specific `aria-label`, except for the explicit Admin Returns exception below. Navigation, page CTAs, statistics, filters and final confirmation buttons retain their existing styles. Ordinary book grid cards retain their textual detail CTA.

## Mandatory exception: Admin Returns

`Admin > Transaksi > Pengembalian` retains two clearly labelled decisions:

- **Konfirmasi Pengembalian** with FiCornerDownLeft and soft success styling.
- **Buku Hilang** with FiAlertTriangle and soft danger styling.

These are text buttons, not square icon-only actions. Both retain object-specific accessible names, the existing loading/disabled expressions, native button semantics and the original ConfirmDialog handlers. Existing ButtonLabel reserves pending-label space. Scoped `returnsActionsCell`/`returnsActions` rules in `AdminTransactions.module.css` size the action column to its content and prevent labels from shrinking; the buttons stack below 700px. The existing table scroll container is retained, with no page overflow. Other tables keep icon-only actions.

This exception changed only `admin/AdminReturnsPage.tsx`, its scoped styles in `admin/AdminTransactions.module.css`, and this document. Browser checks at 1440/768/390px passed for full labels, aligned/stacked 40-44px controls, no control/page overflow, Space/Enter, both existing confirmations/endpoints, cancellation without mutation, stable pending dimensions and single submit. A representative other table retained its icon controls at all three widths. TypeScript, Returns-file ESLint, four Button tests, production build and the AST behavior-preservation check passed. Mutation checks used an isolated in-memory API fixture.

## Reusable system

- `components/Button.tsx`: `Button` and `ButtonLink` accept `rowAction`. Existing native buttons and links can use `data-row-action` with `data-button` directly.
- `components/buttons.css`: shared soft semantic tokens, compact dimensions, hover/pressed/focus/disabled states and a loading indicator for square icon actions. Square actions use inline flex with a fixed basis so legacy full-width/block styles cannot stretch the icon controls.
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

32 compact action templates use icons: 20 admin, 11 member and one public catalog list action. The two Admin Returns decisions use text under the mandatory exception. Mapped records can render these templates multiple times.

| Area | Files | Actions |
| --- | --- | --- |
| Public | `catalog/BookCard.tsx`, `catalog/Catalog.tsx` | Eye detail action only in catalog list mode. The explicit rowAction flag is separate from compact recommendation-grid cards. Landing/grid/recommendation CTAs retain text |
| Member | `members/LoanCard.tsx`, `members/ReservationCard.tsx` | Loan detail, extension, replacement information, reservation cancellation |
| Member | `members/EBooksPage.tsx`, `members/NotificationsPage.tsx` | Read/return/borrow/cancel/status actions; per-record mark read |
| Admin | `admin/AdminBooksPage.tsx`, `admin/AdminEBooksPage.tsx` | View, edit, activate/deactivate icon actions |
| Admin | `admin/AdminMembersPage.tsx` | Eye, Edit2, Power in desktop and mobile records; fixed square dimensions remain stable while the icon becomes a spinner |
| Admin | `admin/AdminGrantsPage.tsx`, `admin/AdminGrantForm.tsx` | View/edit records, remove unsaved item |
| Admin | `admin/AdminReservationsPage.tsx`, `admin/AdminReturnsPage.tsx` | Pickup uses an icon; return and mark-lost decisions retain text under the mandatory exception |
| Admin | `admin/AdminLoansPage.tsx`, `admin/AdminLostBooksPage.tsx` | Existing WhatsApp reminder and member detail |

This revision adjusts compact action layouts in `admin/AdminMembers.module.css`, `admin/AdminGrants.module.css`, `members/Loans.module.css`, `members/Reservations.module.css`, `members/EBooks.module.css` and `members/Notifications.module.css`. The Members action-group minimum width and mobile full-width action grids were removed. Loan/E-Book actions wrap with 8px gaps; admin groups use 6-7px gaps.

## Icon mapping

| Action | Existing react-icons/fi icon |
| --- | --- |
| Detail/status | FiEye |
| Edit | FiEdit2 |
| Activate/deactivate | FiPower |
| Remove unsaved grant item | FiTrash2 |
| Confirm pickup | FiCheckCircle |
| Return | FiCornerDownLeft |
| Extend loan | FiRefreshCw |
| Cancel reservation/queue | FiXCircle |
| Read/borrow E-Book | FiBookOpen |
| Mark notification read | FiCheck |
| Replacement information | FiInfo |
| Mark book lost | FiAlertTriangle |
| Existing WhatsApp reminder | FiMessageCircle |

All actual compact controls have hidden decorative SVGs and explicit accessible names. No new reject, verify or download action was invented where the current application has none.

## Deliberate exclusions

- Whole-row links in dashboard insights and notifications retain their existing row interaction. Notification detail is now an `aria-hidden` Eye cue, not another button; the actual mark-read button uses the neutral appearance and retains event propagation protection.
- Ordinary title/cover links, metadata/source links, FAQ disclosures, reader navigation, pagination, filter controls, form submission and page/detail CTAs remain outside this scope.
- Public grants, member history/profile, admin E-Book circulation and other audited sections without record action buttons require no new controls.
- Header download/export controls remain page-level actions; no artificial row export feature was introduced.
- Existing direct E-Book actions retain their own submission flow. Existing ConfirmDialog rules and final confirmation styles were not changed.

## Verification

Browser verification uses the production build with an isolated in-memory API fixture, not database mutations or external messages. It covers public, member and admin record actions at 1440/768/390px, including the existing horizontally scrollable table on mobile. Checks cover color contrast, dimensions, no new page overflow, hover/focus tooltips, native keyboard/link routing, stable loading dimensions, disabled/double-click protection, confirmation cancellation/submission and notification read-button propagation.

Original icon-only rollout results (the Returns exception has separate verification above):

- 69 page/viewport checks passed: 23 public/member/admin views at all three widths, including icon-only content, browser accessibility-tree names, 40/44px dimensions and keyboard-focus tooltip clipping checks.
- 21 interaction checks passed, plus Space/Enter, focus restoration and stable member-status loading dimensions at each of 1440/768/390px.
- `npx tsc --noEmit` passed; ESLint passed for all changed TSX/test files and the new tooltip component.
- 34 relevant Node tests passed across Button, StatCard, book detail, dashboard insights, chart and period suites.
- `npm run build` passed with all 68 static pages generated.
- `git diff --check` passed.

An AST comparison verifies the 15 modified templates preserve existing hrefs, callbacks, disabled/loading expressions, all ConfirmDialog props and API/state calls. Backend, API routes, database, auth, StatCard, charts and PeriodSelector were not modified. The current landing has real collection destinations; app/page.tsx was not changed by this icon-only revision.
