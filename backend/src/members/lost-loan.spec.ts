import { MembersService } from './members.service';
import { ForbiddenException } from '@nestjs/common';

const original = () => ({ id: 7, userId: 1, bookId: 2, copyId: 3, status: 'AKTIF', returnedAt: null,
  borrowedAt: new Date('2026-10-01T00:00:00Z'), dueAt: new Date('2026-10-08T00:00:00Z'), extensionCount: 0,
  lostReportStatus: null, lostReportSource: null, lostReportedAt: null, lostVerifiedAt: null, lostResolvedAt: null,
  book: { id: 2, title: 'Buku Fisik', code: 'BK-2', type: 'FISIK', coverUrl: '', author: 'Penulis' },
  copy: { id: 3, bookId: 2, code: 'COPY-3', status: 'DIPINJAM' },
});
function harness(overrides = {}) {
  const row = { ...original(), ...overrides };
  let lock = Promise.resolve();
  const tx = {
    $queryRaw: jest.fn(async () => []),
    loan: { findUnique: jest.fn(async () => row), findFirst: jest.fn(async () => row),
      update: jest.fn(async ({ data }) => Object.assign(row, data)) },
    bookCopy: { updateMany: jest.fn(async ({ data }) => { Object.assign(row.copy, data); return { count: 1 }; }) },
    notification: { createMany: jest.fn(async () => ({ count: 1 })), updateMany: jest.fn(async () => ({ count: 0 })) },
  };
  const prisma = { ...tx, $transaction: jest.fn((work) => {
    const next = lock.then(() => work(tx)); lock = next.catch(() => {}); return next;
  }) };
  return { row, tx, prisma, service: new MembersService(prisma as never, {} as never) };
}

describe('member lost report on existing Loan', () => {
  it('records pending report only, preserving loan, due date and inventory; notifies once', async () => {
    const { service, row, tx } = harness();
    const result = await service.reportLostLoan(1, 7);
    expect(result.loan.lostReport.status).toBe('MENUNGGU_VERIFIKASI');
    expect(row.status).toBe('AKTIF'); expect(row.copy.status).toBe('DIPINJAM'); expect(row.returnedAt).toBeNull();
    expect(row.dueAt.toISOString()).toBe('2026-10-08T00:00:00.000Z');
    expect(tx.bookCopy.updateMany).not.toHaveBeenCalled();
    expect(tx.notification.createMany).toHaveBeenCalledWith(expect.objectContaining({ data: [expect.objectContaining({ userId: 1, eventKey: 'loan:7:lost-report', href: '/dashboard/pinjaman/7' })] }));
  });
  it('rejects another member loan with 403 and does not mutate or expose it', async () => {
    const { service, tx } = harness({ userId: 2 });
    await expect(service.reportLostLoan(1, 7)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.memberLoanDetail(1, 7)).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.loan.update).not.toHaveBeenCalled(); expect(tx.bookCopy.updateMany).not.toHaveBeenCalled();
  });
  it.each([{ status: 'DIKEMBALIKAN' }, { status: 'HILANG' }, { returnedAt: new Date() },
    { book: { ...original().book, type: 'EBOOK' } }, { copy: { ...original().copy, status: 'TERSEDIA' } },
    { copy: { ...original().copy, bookId: 999 } }])('rejects invalid loan/copy %j', async (change) => {
    const { service, tx } = harness(change);
    await expect(service.reportLostLoan(1, 7)).rejects.toThrow();
    expect(tx.loan.update).not.toHaveBeenCalled();
  });
  it('serializes concurrent duplicate requests and creates only one pending report/event', async () => {
    const { service, tx } = harness();
    await Promise.all([service.reportLostLoan(1, 7), service.reportLostLoan(1, 7)]);
    expect(tx.loan.update).toHaveBeenCalledTimes(1);
    expect(tx.notification.createMany).toHaveBeenCalledTimes(1);
    expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
  });
  it('blocks extension and normal return after report without changing due date/copy', async () => {
    const { service, tx, row } = harness({ lostReportStatus: 'MENUNGGU_VERIFIKASI' });
    await expect(service.extend(1, 7, { expectedDueAt: row.dueAt.toISOString() })).rejects.toThrow(/laporan kehilangan/i);
    await expect(service.finishLoan(7, false)).rejects.toThrow(/laporan kehilangan/i);
    expect(tx.loan.update).not.toHaveBeenCalled(); expect(tx.bookCopy.updateMany).not.toHaveBeenCalled();
  });
  it('admin verification reuses lost finalization and keeps member origin', async () => {
    const { service, row } = harness({ lostReportStatus: 'MENUNGGU_VERIFIKASI', lostReportSource: 'ANGGOTA', lostReportedAt: new Date() });
    await service.finishLoan(7, true);
    expect(row.status).toBe('HILANG'); expect(row.copy.status).toBe('HILANG');
    expect(row.lostReportStatus).toBe('PROSES_PENGGANTIAN'); expect(row.lostReportSource).toBe('ANGGOTA');
    expect(row.lostVerifiedAt).toBeInstanceOf(Date);
  });
  it('completion is admin-only resolution on the same loan, idempotent and never releases the missing copy', async () => {
    const { service, tx, row } = harness({ status: 'HILANG', lostReportStatus: 'PROSES_PENGGANTIAN', copy: { ...original().copy, status: 'HILANG' } });
    await service.completeLostLoan(7);
    await service.completeLostLoan(7);
    expect(row.lostReportStatus).toBe('SELESAI'); expect(row.status).toBe('HILANG'); expect(row.returnedAt).toBeNull();
    expect(row.copy.status).toBe('HILANG'); expect(tx.bookCopy.updateMany).not.toHaveBeenCalled();
    expect(tx.loan.update).toHaveBeenCalledTimes(1);
  });
  it('cannot complete a pending report before verification', async () => {
    const { service, tx } = harness({ lostReportStatus: 'MENUNGGU_VERIFIKASI' });
    await expect(service.completeLostLoan(7)).rejects.toThrow();
    expect(tx.loan.update).not.toHaveBeenCalled();
  });
  it('preserves the existing direct admin entry point with ADMIN origin and replacement status', async () => {
    const { service, row } = harness();
    await service.finishLoan(7, true);
    expect(row.status).toBe('HILANG'); expect(row.lostReportSource).toBe('ADMIN');
    expect(row.lostReportStatus).toBe('PROSES_PENGGANTIAN');
  });
  it('can resolve a legacy admin HILANG case without fabricating its report date or releasing stock', async () => {
    const { service, row, tx } = harness({ status: 'HILANG', copy: { ...original().copy, status: 'HILANG' } });
    await service.completeLostLoan(7);
    expect(row.lostReportStatus).toBe('SELESAI'); expect(row.lostReportSource).toBe('ADMIN');
    expect(row.lostReportedAt).toBeNull(); expect(row.lostVerifiedAt).toBeNull();
    expect(tx.bookCopy.updateMany).not.toHaveBeenCalled();
  });
});
