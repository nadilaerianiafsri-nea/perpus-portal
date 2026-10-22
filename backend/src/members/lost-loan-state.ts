import type { Loan } from '../generated/prisma/client';

type LostLoan = Pick<Loan, 'status' | 'lostReportStatus' | 'lostReportSource' | 'lostReportedAt' | 'lostVerifiedAt' | 'lostResolvedAt'>;

/** Legacy HILANG rows were created only by admin; never fabricate their dates. */
export function lostReportView(row: LostLoan) {
  const status = row.lostReportStatus ?? (row.status === 'HILANG' ? 'PROSES_PENGGANTIAN' : null);
  return status ? {
    status,
    source: row.lostReportSource ?? 'ADMIN',
    reportedAt: row.lostReportedAt ?? null,
    verifiedAt: row.lostVerifiedAt ?? null,
    resolvedAt: row.lostResolvedAt ?? null,
  } : null;
}
