# Global Custom Select Implementation Plan

> For agentic workers: implement the isolated migrations in parallel; root owns the component, PeriodSelector, integration and final verification. User requests direct completion without an approval pause or commit.

**Goal:** All relevant public/member/admin option pickers use one accessible custom panel while preserving values, callbacks, validation and filter/form semantics.

**Architecture:** `components/AppSelect.tsx` accepts existing single-select props and option children, with optional options/label/placeholder/icon/error/loading. Its visible button is a select-only combobox with a top-layer listbox. A nonvisual native select bridges existing React ChangeEvent handlers, FormData, required validation and reset; native option UI is never opened. `components/selects.css` owns tokens and scoped shared styles. Keep native hidden bridge inside AppSelect only.

**Tech stack:** Existing React19, Next16, react-icons and CSS; no dependencies added.

**Spec:** `C:/Users/ASUS/.codex/attachments/c1e17063-7e1e-4b48-bde0-1fa66dc15a2f/Pasted text.txt`.

## Global constraints

- No backend/API/schema/auth/role/filter/transaction/validation rule changes; preserve onChange expressions, name/id/required/disabled/aria, options, values, initial values, draft/apply behavior and endpoint parameters.
- No button/stat/table/modal/sidebar/navbar/chart redesign. Only select wrappers/spacing and duplicated chevrons may change.
- White/slate trigger, navy text, selected soft navy plus right check, hover soft yellow; Outfit14px, label12px, trigger48px, option44px, panel max-height320px.
- Existing PeriodSelector retains choose/createPeriod/draft/apply/custom-range behavior.
- No new search field; type-to-select can preserve native keyboard convenience.

## Shared interface

`AppSelect` default export from `@/components/AppSelect` accepts `SelectHTMLAttributes<HTMLSelectElement>` single-value props (except native size/multiple/ref and keyboard handlers), existing `<option>` children, and an `onChange` receiving the real hidden-select ChangeEvent. Extra optional props: `options: {value:string|number,label:string,disabled?:boolean}[]`, `label`, `placeholder`, `loading`, `error`, `icon`, `size: 'sm'|'md'`, and `ref: Ref<HTMLButtonElement>` for PeriodSelector positioning/focus. `className` applies to the root; a trigger marker enables scoped styling. Preserve option children and callbacks verbatim during migration.

## Review focus

- Hidden native control never enters keyboard/AX navigation or opens OS menu; required invalid focuses the visible trigger and preserves form blocking.
- Controlled/uncontrolled/initial values, FormData, external updates and reset stay in sync.
- Listbox in a filter dialog must remain interactive, escape independently and avoid clipping; top-layer host is nearest open dialog/popover or body.
- Panel stays within viewport, flips upward and scrolls focused items into view; narrow/long labels stay readable.
- Outside click, Tab, Escape, choosing options and switching pickers do not steal or lose focus.

## Tasks

- [x] Root: implement shared AppSelect and tokens/styles with SSR + browser interaction tests covering the requested15 cases. No native-looking visible dropdown remains.
- [x] Admin forms/catalog worker: migrate AdminBookForm, AdminEBookForm, AdminMemberForm, AdminGrantForm, AdminBooksPage and AdminGrantsPage. Adjust only select wrapper CSS; preserve all semantics.
- [x] Admin transactions worker: migrate AdminMembersPage, AdminReservationsPage, AdminLoansPage, AdminReturnsPage, AdminLostBooksPage and AdminNotificationsPage. Adjust only select wrappers.
- [x] Public/member worker: migrate catalog/Catalog.tsx, catalog/Filters.tsx and information/Grants.tsx. Remove duplicate external chevrons and align select-specific wrappers; preserve public/member differences and existing filters.
- [x] Root: migrate PeriodSelector preset picker and its trigger ref, preserving date/popover/apply semantics; update relevant period tests if markup assertions change.
- [x] Review scope, callback/option preservation and native-select audit. Document unused/non-option controls and hidden bridge rationale in `docs/select-audit.md`.
- [x] Verify reusable component and representative real routes at1440/768/390: keyboard, selected/check/hover, scroll/placement, dialog, disabled/error/loading/empty, initial/reset/FormData, immediate and draft filters, PeriodSelector dates.
- [x] TypeScript, changed-file ESLint, relevant tests, production build, source/diff checks and independent review; close owned test processes, report and stop.
