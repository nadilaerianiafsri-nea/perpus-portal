# Member lost-book entry point implementation plan

**Goal:** Anggota melaporkan pinjaman fisik sendiri, admin memverifikasi dan menyelesaikan kasus di menu Buku Hilang & Penggantian existing.

**Architecture:** Extend Loan existing with nullable report metadata and three lifecycle states; do not add a second case table. Reuse MembersService transaction/row lock/event/finishLoan, current guards/proxy/ConfirmDialog and existing admin list. Preserve existing HILANG loans as legacy ADMIN cases in replacement process; unknown dates stay empty.

**Spec:** User attachment `f07431fa-339e-417c-8445-9dae7f1b99aa/Pasted text.txt`.

**Scope decisions from audit:** No persisted verification/replacement completion exists today. Add the minimum pending/process/completed report state on Loan. Admin verification calls the existing lost operation; completion records resolution without making the missing original copy available or fabricating a replacement copy. Replacement policy remains the existing same-book/library policy without money fines. Member report uses confirmation only, no extra input. Member detail route does not exist, so add `/dashboard/pinjaman/[id]`; add detail under the existing admin lost menu. No reject/found transition because existing flow does not support it.

- [x] Add failing backend workflow/security tests: own physical active loan, IDOR403, no E-Book/returned/copy mismatch, duplicate/concurrent report, no early inventory mutation, extension/return blocked, admin verification reuses finishLoan, completion preserves inventory; strict body and route guards.
- [x] Add nullable Loan metadata and non-destructive additive migration; generate client. Implement report/detail/complete within MembersService, integrate admin list status filtering and legacy cases. Test source-of-truth and race locks.
- [x] Reuse Notification rows: receipt/status notifications to member and project new member report as SYSTEM admin notification with correct case link/read state. Update unresolved lost dashboard filters only where needed.
- [x] Extend member LoanCard/ConfirmDialog and add safe member loan detail; reuse shared UI to add admin case detail, verification and completion confirmation. Preserve compact list actions elsewhere, stack text report actions on mobile.
- [x] Verify migration validation/deploy safely, TypeScript/lint, frontend and targeted backend+HTTP security tests, browser1440/768/390 and keyboard/pending/retry/notifications, both builds, final review and audit/file inventory. No commits or destructive commands.

**Review focus:** memberId mass assignment; same-loan concurrent report vs extension/return; legacy HILANG records without metadata; pending report must leave copy DIPINJAM and Loan AKTIF; completion must never restore missing copy or expose admin metadata to member.
