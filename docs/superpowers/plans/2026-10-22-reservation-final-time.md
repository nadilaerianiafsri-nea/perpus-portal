# Final reservation flow and transaction periods

Preserve the completed reservation route, live lookup, pickup handler and confirmation dialog. Finish the requested presentation and date filtering without backend or schema changes.

1. Add final-status Detail navigation to the same reservation route; retain Proses only for the actual waiting enum. Match the specified navy/yellow and neutral navigation variants. Show remaining pickup time and contextual read-only notices.
2. Extend PeriodSelector with a backward-compatible transaction mode and shared WIB calendar helpers. Test all presets, inclusive boundaries and invalid dates. Keep draft range independent until Apply, with Cancel/Escape restoring the applied choice.
3. Filter the currently loaded transaction page, explicitly identified in each list. Reservation uses createdAt; loans and pending returns use borrowedAt; E-Book uses borrowedAt/queuedAt/endedAt per tab. Skip lost books because the API has no report timestamp. Keep server pagination and KPI scope intact. CSV uses exactly the visible reservation rows and order.
4. Verify actual action routes, active/final modes, custom validation/cancel/apply/reset/keyboard, filter combinations and CSV; inspect responsive layouts at 1440/768/390. Run TypeScript, changed-file ESLint, relevant unit/browser tests and production frontend build.

Independent work: selector/helpers and other transaction-page integrations can proceed separately from reservation changes. No commits, database writes or real transaction testing.
