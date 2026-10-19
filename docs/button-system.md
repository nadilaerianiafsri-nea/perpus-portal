# Shared action buttons

Scope: public pages and authentication, member pages, and all live admin screens.
Only action presentation changes; routes, handlers, validation and business flows stay intact.

## Implementation and verification plan

- [x] Inventory native buttons and link-buttons in all three areas, including dialogs, upload triggers, tables, readers and pagination.
- [x] Add shared tokens and opt-in styles with primary, secondary, ghost, danger, success, warning and icon variants.
- [x] Add reusable native Button and navigation ButtonLink; test loading disables submission and navigation stays a link.
- [x] Apply semantic attributes to existing actions without replacing event handlers or layout classes.
- [x] Check actual hover, focus, disabled, loading and selected styles in desktop/tablet/mobile browsers, including admin tables and modal actions.
- [x] Complete TypeScript, changed-file lint, frontend build and final source audit; retain the existing admin lint diagnostics documented below.

## API

`components/Button.tsx` exposes Button and ButtonLink with variant, size (`sm`, `md`, `lg`), fullWidth and optional icon. Button additionally supports loading and loadingLabel. Native buttons default to type=button; submit actions must specify type=submit. Loading keeps both label widths in the layout and disables the button.

ButtonLabel shares that stable-width label treatment with existing native buttons. Its loading condition and pending/idle copy come directly from their existing render branches; handlers and disabled conditions stay intact. Input-adjacent password controls use data-button-field to fill input height instead of a fixed square.

Existing buttons and links opt into the same style with `data-button="secondary"`, optional `data-button-size="sm"`, `data-button-shape="square|circle|pill"`, and `data-button-inverse` on dark surfaces. All rules and tokens live in `components/buttons.css`, imported after globals in the root layout. Existing classes continue to control placement, responsive width and other layout details. No repeated CSS theme per page is needed.

Primary is navy; secondary uses a soft navy tint and becomes navy on hover. Ghost is transparent with a soft hover surface. Danger is soft red; danger-solid uses a darker error tint for legible white confirmation text. Success and warning use soft status surfaces and dark text. Selected tabs, filters and pages retain navy through hover/focus using existing aria-selected, aria-pressed, aria-current or data-button-active.

Sizes have minimum heights 36/42/50px; regular mobile controls are at least 44px. Radius is 11px; navbar pills and circular shell icons are intentional exceptions. All opt-in actions share focus-visible, pressed and disabled states and respect reduced motion.

## Audit boundaries and intentional neutral surfaces

- Public: landing/navbar CTAs; shared catalog cards and recommendations; physical/e-book details and reader actions; grants pagination; contact; login/register/password/verification screens; error and not-found recovery.
- Members: summary CTAs/right panel, catalog/drawer/chips/pagination, reservations, loans and dialogs, e-books and tabs, history, notification actions, profile save, logout and shell icon controls.
- Admin: dashboard/reports/settings/profile; physical/e-book lists/details/forms/uploads; grants; member lists/details/forms; reservations/pickup dialogs; loans/returns/lost books; e-book circulation; notifications; table and pagination actions.
- Form inputs, native selects, upload fields, neutral card surfaces, registration radio cards and full-row FAQ disclosures intentionally keep their surface design. They are not CTA buttons.
- Sidebar/navbar navigation, breadcrumbs, book covers/titles, statistic cards, avatars and the stretched notification-card link retain their existing navigation geometry and interaction states.
- The full-screen admin menu overlay stays visually transparent. Unreferenced `admin/dminGrantsPage.tsx` is not a live route and is excluded.
- Legacy module files may still declare white backgrounds for old action classes. Annotated live actions resolve their appearance from the shared system; these declarations are not a second button theme.

Browser checks use an isolated HTTP fixture, with no database writes, real emails or live destructive actions.

## Final verification (2026-10-19)

- 93 page/viewport checks: 16 public, 10 member and 28 admin desktop routes, representative routes at tablet 768px and mobile 390px, plus drawer and modal states. No horizontal page overflow or runtime exceptions were recorded.
- Computed shared colors, secondary hover, selected hover, focus-visible, disabled pagination, member loan modal and admin pickup modal checked in Chrome.
- Loading size/disabled behavior checked on ContactForm against the isolated HTTP fixture and on the existing native loan-extension confirmation.
- Registration password icons align with inputs at 390px. Actual HTML reader retains its fixed back action. Both public/member not-found recovery actions use the shared system.
- Measured text contrast: primary 19.56:1; secondary 17.17:1; danger 6.49:1; danger-solid 5.61:1; success 6.37:1; warning 6.14:1. Disabled controls are intentionally muted.
- Frontend build and TypeScript passed. Five button/filter regression tests passed. Diff whitespace checks passed.
- Changed-file ESLint comparison against HEAD: **0 new errors**. Full lint still reports **8 pre-existing React Hooks errors in 7 admin files**: AdminDashboard, AdminGrantDetail, AdminMemberDetail (2), AdminNotificationsPage, AdminProfilePage, AdminReportsPage and AdminSettingsPage. These are existing effect/purity issues and were retained to avoid changing business flows in a visual task.
- No backend, database, API, route, validation or security changes. The member e-book clock initializer is made lazy (`useState(() => Date.now())`) to preserve its value while satisfying the existing purity rule.

## Changed files

- `admin/AdminBookDetail.tsx`
- `admin/AdminBookForm.tsx`
- `admin/AdminBooksPage.tsx`
- `admin/AdminDashboard.tsx`
- `admin/AdminEBookCirculationPage.tsx`
- `admin/AdminEBookDetail.tsx`
- `admin/AdminEBookForm.tsx`
- `admin/AdminEBooksPage.tsx`
- `admin/AdminGrantDetail.tsx`
- `admin/AdminGrantForm.tsx`
- `admin/AdminGrantsPage.tsx`
- `admin/AdminLoansPage.tsx`
- `admin/AdminLostBooksPage.tsx`
- `admin/AdminMemberDetail.tsx`
- `admin/AdminMemberForm.tsx`
- `admin/AdminMembersPage.tsx`
- `admin/AdminNotificationsPage.tsx`
- `admin/AdminProfilePage.tsx`
- `admin/AdminReportsPage.tsx`
- `admin/AdminReservationsPage.tsx`
- `admin/AdminReturnsPage.tsx`
- `admin/AdminSettingsPage.tsx`
- `admin/AdminShell.tsx`
- `app/dashboard/koleksi/[id]/not-found.tsx`
- `app/e-book/[id]/baca/page.tsx`
- `app/koleksi/[id]/not-found.tsx`
- `app/layout.tsx`
- `app/page.tsx`
- `auth/CheckEmail.tsx`
- `auth/Login.tsx`
- `auth/PasswordRecovery.tsx`
- `auth/Register.tsx`
- `auth/ResendVerification.tsx`
- `auth/VerifyEmail.tsx`
- `auth/WaitingVerification.tsx`
- `catalog/BookCard.tsx`
- `catalog/BookDetail.tsx`
- `catalog/BookDetailLayout.tsx`
- `catalog/BorrowAction.tsx`
- `catalog/Catalog.tsx`
- `catalog/EBookDetailLayout.tsx`
- `catalog/EBookLibraryAction.tsx`
- `catalog/EBookReader.tsx`
- `catalog/Filters.tsx`
- `catalog/MemberFilterDrawer.tsx`
- `catalog/PdfReader.tsx`
- `catalog/RelatedBooks.tsx`
- `components/Button.test.mjs`
- `components/Button.tsx`
- `components/LandingNavbar.tsx`
- `components/buttons.css`
- `docs/button-system.md`
- `information/ContactForm.tsx`
- `information/Grants.tsx`
- `members/EBooksPage.tsx`
- `members/HistoryPage.tsx`
- `members/LoanCard.tsx`
- `members/LoanDialog.tsx`
- `members/LoansPage.tsx`
- `members/MemberRightPanel.tsx`
- `members/MemberShell.tsx`
- `members/MemberUI.tsx`
- `members/NotificationsPage.tsx`
- `members/ProfilePage.tsx`
- `members/ReservationCard.tsx`
- `members/ReservationsPage.tsx`
- `members/SummaryPage.tsx`
