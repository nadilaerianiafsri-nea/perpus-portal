# Typography Standardization Implementation Plan

> For agentic workers: execute scoped CSS audits in parallel; root owns shared tokens, integration, responsive/browser verification and final review. User explicitly requests direct completion, preserving all existing work, without approval pauses or commits.

**Goal:** Readable, consistent typography on existing Tambah/Edit/Detail and Public/Member/Admin pages, without redesigning components or changing behavior.

**Architecture:** One token-only `components/typography.css` imported by root layout. Apply semantic tokens in existing CSS Modules/global content selectors; preserve already-correct hero, tables, stat cards, buttons and dropdown designs. Only necessary wrapping/spacing adjustments.

**Tech stack:** Existing Outfit, CSS Modules, React/Next; no dependencies.

**Spec:** `C:/Users/ASUS/.codex/attachments/d7ca1874-d56e-4677-bb69-c4d91cb5507e/Pasted text.txt` and attached Edit E-Book/Detail E-Book/Detail Anggota screenshots.

## Constraints and token contract

- No data, API, backend, schema, auth, route, business/filter/transaction logic, submission or behavior changes.
- No new font, no blanket body font-size, no card/table/button/dropdown redesign, no rollback of existing work.
- Tokens: `--text-xs`12px, `--text-sm`13px, `--text-base`14px, `--text-md`15px, `--text-subsection`16px, `--text-section`18px, `--text-page`32px/28px@1024/26px@600, `--text-detail-title`28px/24px@600.
- Semantic tokens: `--text-form-label`13px, `--text-input`14px, `--text-detail-label`13px, `--text-detail-value`15px, `--text-secondary`13px, `--text-helper`12px, `--text-body`15px, `--text-badge`12px, `--text-button`14px, `--text-breadcrumb`12px.
- Color: `--text-secondary-color`#4b5e8c (existing slate); primary existing navy. Keep inverse text on colored surfaces and semantic error/success colors.
- Leading: `--leading-title`1.2, `--leading-section`1.3, `--leading-body`1.5, `--leading-helper`1.45.
- Form labels500â€“600, detail values500â€“600, section/page600â€“700, body400â€“500. Labels/value gap4â€“6px, detail rows14â€“18px where needed.
- Existing records remain primary14px / secondary-header-badge12px. Existing dropdown trigger/option14px, own label12px. Button sizes remain14px; back labels600. KPIs retain their design.

## Review focus

- Legacy CSS/mobile overrides must not reintroduce 9â€“11px user-readable text.
- Form labels must not accidentally style nested AppSelect value/helper spans.
- Long names/email/URLs wrap; responsive stacking prevents clipping, without shrinking text.
- Sidebar, stats, table typography and dropdown styles keep their own scoped rules.
- At 200% zoom, keyboard focus, input/helper labels and actions stay visible and reachable.

## Tasks

- [x] Audit current active CSS and route ownership; preserve clean baseline.
- [x] Root: create token file/import; audit admin shell/transactions/reports/notifications/content settings not owned by workers and shared component typography only where too small.
- [x] Admin worker: audit Books/BooksEnhancements/Members/Grants/Profile/Settings CSS, prioritizing Tambah/Edit/Detail screenshots; only typography/necessary spacing.
- [x] Public worker: audit catalog/detail/reader, information/contact, auth, landing content and shared public footer/accordion CSS; no hero redesign or flow changes.
- [x] Member worker: audit all members CSS (summary/profile/reservations/loans/history/ebooks/notifications), preserving tables/stat cards.
- [x] Review changed selectors and prove no behavior/endpoint/markup logic changed; independent review of combined CSS.
- [x] Production browser checks at1440/768/390 for representative required routes, long content and200% zoom; inspect typography and overflow/focus.
- [x] Run TypeScript, changed-file lint, relevant tests, build and diff checks; document inventory/scale/exceptions/files/evidence; clean owned test processes and report.
