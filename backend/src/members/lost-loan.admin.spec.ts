import { AdminTransactionsService } from './admin-transactions.service';
import { AdminOperationsService } from './admin-operations.service';
import { lostReportView } from './lost-loan-state';

describe('lost-case admin monitoring, legacy compatibility and notifications', () => {
  const row = { id: 7, status: 'AKTIF', lostReportStatus: 'MENUNGGU_VERIFIKASI', lostReportSource: 'ANGGOTA',
    lostReportedAt: new Date(), lostVerifiedAt: null, lostResolvedAt: null, borrowedAt: new Date(), dueAt: new Date(), extensionCount: 0,
    user: { id: 1, name: 'Anggota', email: 'a@example.test', memberType: 'UMUM', memberProfile: { whatsapp: '0812' } },
    book: { id: 2, title: 'Buku', code: 'BK2', coverUrl: '' }, copy: { id: 3, code: 'COPY3' } };
  it('includes pending member reports as well as legacy HILANG rows in the existing list, with real state filters', async () => {
    const prisma = { loan: { count: jest.fn(async () => 1), groupBy: jest.fn(async () => [{ userId: 1 }]), findMany: jest.fn(async () => [row]) } };
    const service = new AdminTransactionsService(prisma as never, {} as never);
    for (const [status, value] of [['PENDING', 'MENUNGGU_VERIFIKASI'], ['PROCESS', 'PROSES_PENGGANTIAN'], ['COMPLETED', 'SELESAI']]) {
      const result = await service.lostBooks({ status });
      expect(result.data[0].lostReport?.source).toBe('ANGGOTA');
      const where = prisma.loan.findMany.mock.calls.at(-1)?.[0];
      expect(JSON.stringify(where)).toContain(value);
      expect(JSON.stringify(where)).toContain('HILANG');
    }
  });
  it('loads actual case detail rather than unrelated member detail', async () => {
    const prisma = { loan: { findFirst: jest.fn(async () => row as typeof row | null) } };
    const service = new AdminTransactionsService(prisma as never, {} as never);
    expect((await service.lostBookDetail('7')).loan.lostReport?.status).toBe('MENUNGGU_VERIFIKASI');
    prisma.loan.findFirst.mockResolvedValue(null);
    await expect(service.lostBookDetail('7')).rejects.toThrow('Kasus buku hilang tidak ditemukan.');
  });
  it('legacy admin HILANG cases remain replacement cases without fabricated dates', () => {
    expect(lostReportView({ status: 'HILANG', lostReportStatus: null, lostReportSource: null, lostReportedAt: null, lostVerifiedAt: null, lostResolvedAt: null })).toEqual({ status: 'PROSES_PENGGANTIAN', source: 'ADMIN', reportedAt: null, verifiedAt: null, resolvedAt: null });
  });
  it('projects member report into existing admin SYSTEM notifications with case link and independent read tracking', async () => {
    const notice = { id: 5, eventKey: 'loan:7:lost-report', title: 'Laporan buku hilang diterima', message: 'Menunggu verifikasi',
      createdAt: new Date(), emailDelivery: 'NOT_REQUIRED', whatsappDelivery: 'NOT_REQUIRED', user: row.user };
    const prisma = {
      notification: { findMany: jest.fn(async () => [notice]), count: jest.fn(async () => 1), findFirst: jest.fn(async () => ({ id: 5 })) },
      adminNotificationRead: { findMany: jest.fn(async () => []), upsert: jest.fn(async () => ({ readAt: new Date() })) },
    };
    const service = new AdminOperationsService(prisma as never);
    const result = await service.notifications(99, {});
    expect(result.data[0]).toMatchObject({ channel: 'SYSTEM', href: '/admin/transaksi/buku-hilang-penggantian/7', reminderType: 'Laporan Buku Hilang Baru' });
    expect(await service.unreadNotificationCount(99)).toEqual({ unread: 1 });
    expect(JSON.stringify(prisma.notification.count.mock.calls)).toContain(':lost-report');
    await service.markNotificationRead(99, 5);
    expect(prisma.adminNotificationRead.upsert).toHaveBeenCalledWith(expect.objectContaining({ create: { adminId: 99, notificationId: 5 } }));
  });
});
