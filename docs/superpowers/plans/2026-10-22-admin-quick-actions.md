# Admin operational quick actions

Goal: direct reservation pickup confirmation from the list, above Detail in a vertical compact action stack, while retaining the same detail route and backend rules.

1. Test actual status mapping and exact existing pickup POST contract first. Extract the existing frontend pickup request into one shared module, use one state/lock hook and shared ConfirmDialog presentation from both list and detail. No new endpoints or transitions.
2. Waiting reservations (including derived almost-expired) show Sudah Diambil then secondary Detail; final statuses show only Detail. Preserve all list filters/CSV/pagination. Refresh row/KPI data from the server after success; no optimistic status. Immediate request lock and pending UI prevent duplicates; error remains retryable.
3. Detail remains available for every status. Use the same pickup control/dialog when actionable and show Detail Reservasi as its heading. Preserve date/location/load-error handling.
4. Return/lost text actions remain direct and become consistently vertical at all widths, with intact 14px labels and compact columns. Existing compact icon actions elsewhere remain unchanged.
5. Audit every admin list against actual handlers. Keep complex catalogue, replacement, profile and settings forms; don't invent notification retry or E-Book actions.
6. Verify cancel/no POST, duplicate prevention, pending/failure/retry/success refresh, all statuses and detail routes, keyboard Enter/Space/Tab/focus, 1440/768/390 (plus wide desktop returns), TypeScript, changed-file lint, relevant tests and frontend build. Backend remains untouched.

User authorized direct execution. Preserve workspace, no commits, real transaction writes, schema changes or unrelated fixes.
