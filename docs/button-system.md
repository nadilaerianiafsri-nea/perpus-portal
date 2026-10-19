# Shared button hierarchy

Scope: public/authentication, members, and all live admin pages. Changes concern action presentation only; routes, handlers, validation, security and business flows stay intact.

## Variants

| Variant | Appearance | Use |
| --- | --- | --- |
| primary | Solid navy, white text | Submit, save, add, apply, confirm, borrow and read |
| secondary | Soft navy surface, navy text/border; navy and white on hover | Detail, filter, manage, profile, upload, secondary actions |
| accent | Brand yellow, navy text; darker yellow on hover/press | One focal CTA in a section |
| success | Brand green, navy text; darker green on hover | Activate, approve, confirm pickup/return |
| warning | Brand orange, navy text; darker orange on hover | Distinct table edit and actions needing attention |
| danger | Brand red, navy text; darker red on hover | Delete, reject, deactivate, cancel transactions |
| ghost | Transparent, navy text; soft navy on hover | Back, dismiss, cancel a dialog, reset, forgot-password, light navigation |
| icon | Neutral ghost treatment in a compact square/circle | Menu, bell, close, reader and password controls |

Bright status colors use navy text for contrast. Do not assign colors merely to create variety. Yellow is never the default secondary color.

## Shared API

`components/Button.tsx` exports `Button`, `ButtonLink`, `ButtonLabel`, and `ButtonVariant`. `variant` accepts the variants above, `size` is `sm | md | lg`, and `fullWidth` and `icon` are optional. Button defaults to `type="button"`; submit actions must specify `type="submit"`. Existing loading/disabled behavior and stable label width are retained.

Existing native buttons and Next links opt into the same CSS via `data-button="secondary"`. Optional attributes are `data-button-size="sm|md|lg"`, `data-button-shape="square|circle|pill"`, `data-button-full-width`, and `data-button-inverse` for dark surfaces. Existing classes keep layout responsibilities. All action colors and states live in `components/buttons.css`, imported after globals in the root layout.

Secondary buttons on dark surfaces use a translucent white surface and white text, then primary navy on hover. Inverse ghost/icon controls remain light and transparent. Focus rings on dark surfaces use the existing yellow accent for visibility.

Sizes have minimum heights 36/42/50px and an 11px radius. Regular mobile controls are at least 44px. Navbar pills and circular shell controls are intentional exceptions. Selected tabs, filters and pagination stay navy with white text through hover/focus. Disabled controls use the shared muted neutral surface; reduced motion is respected.

## Applied hierarchy

- Public: hero Cari Koleksi is accent; E-Book exploration and catalog detail/filter are secondary. Navbar Masuk, back navigation, forgot-password and resets are ghost; registration, contact submit and borrow/read are primary.
- Members: hero Cari Koleksi is accent; hero E-Book Saya and profile/detail/info actions are secondary. Section view-all links, inactive tabs and mark-read controls are ghost. Save, extend and read remain primary; transaction cancellation remains danger. Notification stretched-link/read-before-navigation behavior is unchanged.
- Admin: create/save/apply/pickup confirmation actions are primary; refresh/filter/view/detail/management are secondary; table edit actions are warning; activation and returns use success; destructive actions use danger. Back/dismiss/cancel/reset/logout are ghost.
- Dialogs: a normal confirmation is primary, a destructive confirmation is danger, and the dismiss action is ghost. Loading and disabled conditions remain as implemented by each existing flow.
- Pagination: current page navy; other page numbers ghost/soft; previous/next secondary.

Yellow button backgrounds remain only on Cari Koleksi in the public hero and member summary hero. Existing yellow branding, status/KPI accents, active navigation icons and focus indicators are outside this button-color change.

## Audit boundaries

The audit covers public catalog/details/e-book reader/information/authentication; member summary/catalog/reservations/loans/history/e-books/notifications/profile; and admin dashboard/books/e-books/members/grants/transactions/notifications/reports/settings/profile, including table, upload, pagination and modal actions.

Form inputs, native selects, upload fields, registration role cards and FAQ disclosure rows retain their own neutral surfaces. Sidebar/navbar navigation, breadcrumbs, covers/titles, KPI cards and stretched notification-card links retain their existing interaction geometry. The transparent admin drawer backdrop and sidebar disclosure controls are intentionally not CTA buttons. Unreferenced `admin/dminGrantsPage.tsx` is not a live route.

Legacy CSS declarations remain for layout compatibility; annotated actions resolve their visual treatment from the shared system instead of duplicated per-page button themes.

## Verification

Browser verification uses an isolated HTTP fixture without database writes, real SMTP delivery or live destructive actions. Source comparison checks that TSX changes are restricted to button appearance attributes and the accent variant type. Run:

- `npx tsc --noEmit`
- `node --test components/Button.test.mjs catalog/filterOptions.test.cjs`
- `npm run build`
- ESLint on changed TSX files, compared with HEAD for pre-existing diagnostics
- Browser route/state checks at 1440, 768 and 390px

Current build, TypeScript and all five button/filter regression tests pass. Changed-file lint introduces no new diagnostics. Three pre-existing React Hooks errors remain in AdminGrantDetail and AdminMemberDetail; these effect/purity issues are unchanged to preserve the requested visual-only scope.
