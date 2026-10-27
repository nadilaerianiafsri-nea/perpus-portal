import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MembersService } from './members.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('member notification targets on the existing notification dataset', () => {
  function fixture() {
    const events = ['reservation:1:created', 'reservation:2:expired', 'loan:7:returned', 'loan:7:lost-report', 'ebook:queue:9:offered', 'ebook:loan:8:expired', 'extension:11', 'legacy'];
    const rows = events.map((eventKey, index) => ({ id: index + 1, eventKey, title: 'Existing title', message: 'Existing description', href: index === 1 || index === 2 ? '/dashboard/riwayat' : '/dashboard/pinjaman', readAt: null, createdAt: new Date() }));
    const prisma = {
      notification: { findMany: jest.fn(async () => rows) },
      eBookLoan: { findMany: jest.fn(async () => [{ id: 8, bookId: 20 }]) },
      eBookQueue: { findMany: jest.fn(async () => [{ id: 9, bookId: 21 }]) },
      loanExtension: { findMany: jest.fn(async () => [{ id: 11, loanId: 7 }]) },
      loan: { findUnique: jest.fn(async () => null) },
    };
    const service = new MembersService(prisma as unknown as PrismaService, {} as MailService);
    jest.spyOn(service, 'expireReservations').mockResolvedValue(undefined);
    jest.spyOn(service, 'createReminders').mockResolvedValue(undefined);
    return { service, prisma, rows };
  }
  it('projects metadata without changing original message, href, order or read state', async () => {
    const { service, prisma, rows } = fixture();
    const { notifications } = await service.notifications(4);
    expect(notifications.map(row => row.targetUrl)).toEqual(['/dashboard/reservasi', '/dashboard/riwayat', '/dashboard/pinjaman/7', '/dashboard/pinjaman/7', '/dashboard/koleksi/21', '/dashboard/koleksi/20', '/dashboard/pinjaman/7', '/dashboard/pinjaman']);
    notifications.forEach((row, index) => {
      expect(row).toMatchObject({ id: rows[index].id, title: rows[index].title, message: rows[index].message, href: rows[index].href, readAt: null });
      expect(row).not.toHaveProperty('eventKey');
      expect(row).not.toHaveProperty('userId');
    });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 4 } }));
    expect(prisma.eBookLoan.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 4, id: { in: [8] } } }));
    expect(prisma.eBookQueue.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 4, id: { in: [9] } } }));
    expect(prisma.loanExtension.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { loan: { userId: 4 }, id: { in: [11] } } }));
  });
  it('missing or inaccessible related records fall back safely, while detail ownership is enforced', async () => {
    const { service, prisma } = fixture();
    prisma.eBookLoan.findMany.mockResolvedValue([]);
    prisma.eBookQueue.findMany.mockResolvedValue([]);
    prisma.loanExtension.findMany.mockResolvedValue([]);
    const { notifications } = await service.notifications(4);
    expect(notifications[4].targetUrl).toBe('/dashboard/e-book');
    expect(notifications[5].targetUrl).toBe('/dashboard/e-book');
    expect(notifications[6].targetUrl).toBe('/dashboard/pinjaman');
    await expect(service.memberLoanDetail(5, 7)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.loan.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 7 } }));
  });
  it('a known detail ID from a different member cannot expose its record', async () => {
    const service = new MembersService({ loan: { findUnique: async () => ({ id: 7, userId: 4 }) } } as unknown as PrismaService, {} as MailService);
    await expect(service.memberLoanDetail(5, 7)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
