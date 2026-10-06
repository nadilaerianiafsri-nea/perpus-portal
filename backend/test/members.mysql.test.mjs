import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';

// Only creates uniquely identified fixtures and removes those exact IDs. No SMTP.
assert.ok(existsSync('dist/members/members.service.js'), 'Member circulation service must be implemented and built');
const { MembersService } = await import('../dist/members/members.service.js');
const { CollectionsService } = await import('../dist/collections/collections.service.js');
const { PrismaService } = await import('../dist/prisma/prisma.service.js');
const { jakartaDay, reminderMilestone } = await import('../dist/members/member.validation.js');
assert.equal(jakartaDay(new Date('2026-10-06T17:00:00Z')) - jakartaDay(new Date('2026-10-06T16:59:59Z')), 1, 'Jakarta midnight determines calendar reminders');
for (const [days, expected] of [[-2, null], [-1, -1], [0, 0], [1, 1], [2, null], [3, 3], [4, null], [5, 5]]) {
  assert.equal(reminderMilestone(new Date('2026-10-07T05:00:00Z'), new Date(Date.parse('2026-10-07T05:00:00Z') + days * 86400000)), expected);
}
const key = `member-test-${randomUUID().slice(0, 8)}`;
const prisma = new PrismaService({ getOrThrow: () => process.env.DATABASE_URL });
const service = new MembersService(prisma, { isConfigured: () => false, sendMemberReminder: async () => { throw new Error('Tests must never send email'); } });
const collections = new CollectionsService(prisma, service);
const users = [], books = [];
const day = 86400000;
try {
  await prisma.$connect();
  for (let i = 0; i < 2; i++) users.push(await prisma.user.create({data: {name: `${key} ${i}`, email: `${key}-${i}@example.test`, passwordHash: 'test-only-no-login', role: 'PENGUNJUNG', memberType: 'UMUM', emailVerified: true, memberProfile: {create: {whatsapp: '081234567890', address: 'Alamat pengujian', identityNumber: key}}}}));
  for (const type of ['FISIK', 'EBOOK']) books.push(await prisma.book.create({data: {code: `${key}-${type}`, title: `Buku ${key}`, author: 'Pengujian', publisher: 'Pengujian', year: 2026, language: 'Indonesia', subject: 'Pengujian', type, format: type === 'EBOOK' ? 'PDF' : 'Cetak', description: 'Fixture terpisah', coverUrl: '/placeholder-book.svg', ebookUrl: type === 'EBOOK' ? '/test.pdf' : null, copies: type === 'FISIK' ? {create: [{code: `${key}-copy`, location: 'Pengujian'}]} : undefined}}));
  const results = await Promise.allSettled(users.map(u => service.reserve(u.id, {bookId: books[0].id})));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1, 'one copy cannot be allocated twice');
  let reservation = results.find(r => r.status === 'fulfilled').value.reservation;
  const owner = (await prisma.reservation.findUnique({where: {id: reservation.id}})).userId;
  const other = users.find(u => u.id !== owner).id;
  assert.equal(new Date(reservation.expiresAt) - new Date(reservation.createdAt), day);
  assert.equal(reservation.pickupLocation, 'Meja Layanan Sirkulasi', 'pickup desk comes from shared service configuration');
  assert.equal(reservation.copy.status, 'DIRESERVASI', 'response includes the actual allocated copy status');
  assert.equal(await prisma.loan.count({where: {userId: owner}}), 0, 'reservation is not a loan');
  await assert.rejects(service.reserve(owner, {bookId: books[0].id}), /reservasi aktif/);
  await assert.rejects(service.cancel(other, reservation.id), /tidak ditemukan/);
  const {loan} = await service.pickup(reservation.id);
  assert.equal(new Date(loan.dueAt) - new Date(loan.borrowedAt), 7 * day);
  const extensionRequest = {expectedDueAt: new Date(loan.dueAt).toISOString()};
  await Promise.all([service.extend(owner, loan.id, extensionRequest), service.extend(owner, loan.id, extensionRequest)]);
  const extended = await prisma.loan.findUnique({where: {id: loan.id}});
  assert.equal(extended.extensionCount, 1, 'concurrent retries of the same confirmed deadline extend only once');
  assert.equal(extended.dueAt.getTime() - new Date(loan.dueAt).getTime(), 7 * day);
  assert.equal(await prisma.loanExtension.count({where: {loanId: loan.id}}), 1);
  await service.extend(owner, loan.id, extensionRequest);
  assert.equal(await prisma.loanExtension.count({where: {loanId: loan.id}}), 1, 'network retry reuses the recorded extension');
  for (let i = 0; i < 3; i++) {
    const current = await prisma.loan.findUnique({where: {id: loan.id}});
    await service.extend(owner, loan.id, {expectedDueAt: current.dueAt.toISOString()});
  }
  assert.equal((await prisma.loan.findUnique({where: {id: loan.id}})).extensionCount, 4, 'there is no artificial extension limit');
  await assert.rejects(service.extend(other, loan.id, extensionRequest), /tidak ditemukan/);
  await assert.rejects(service.extend(owner, loan.id, {expectedDueAt: 'invalid'}), /jatuh tempo/);
  await service.finishLoan(loan.id, false);
  assert.equal((await service.loans(owner)).loans.length, 0, 'returned loans leave Pinjaman Saya');
  reservation = (await service.reserve(owner, {bookId: books[0].id})).reservation;
  await prisma.reservation.update({where: {id: reservation.id}, data: {expiresAt: new Date(Date.now() - 1000)}});
  const releasedCatalog = await collections.detail(String(books[0].id));
  assert.equal(releasedCatalog.availableCopies, 1, 'reading availability expires reservation without waiting for the background interval');
  assert.equal((await prisma.reservation.findUnique({where: {id: reservation.id}})).status, 'KEDALUWARSA');
  await Promise.allSettled([service.expireReservations(), service.pickup(reservation.id), service.cancel(owner, reservation.id)]);
  assert.equal((await prisma.reservation.findUnique({where: {id: reservation.id}})).status, 'KEDALUWARSA');
  assert.equal(await prisma.loan.count({where: {userId: owner}}), 1, 'expired pickup/expiry/cancellation race never creates a loan');
  assert.equal((await prisma.bookCopy.findFirst({where: {bookId: books[0].id}})).status, 'TERSEDIA');
  const repeats = await Promise.allSettled([service.reserve(owner, {bookId: books[0].id}), service.reserve(owner, {bookId: books[0].id})]);
  assert.equal(repeats.filter(r => r.status === 'fulfilled').length, 1, 'same user/book concurrent requests deduplicate');
  const active = repeats.find(r => r.status === 'fulfilled').value.reservation;
  await prisma.reservation.update({where: {id: active.id}, data: {expiresAt: new Date(Date.now() + 3600000)}});
  await Promise.all([service.createReminders(), service.createReminders()]);
  assert.equal(await prisma.notification.count({where: {eventKey: `reservation:${active.id}:almost`}}), 1, 'almost-expiry notification deduplicates concurrently');
  const currentLoan = (await service.pickup(active.id)).loan;
  const due = new Date(Date.now() - day);
  await prisma.loan.update({where: {id: currentLoan.id}, data: {dueAt: due}});
  await service.createReminders();
  await service.createReminders();
  assert.equal(await prisma.notification.count({where: {userId: owner, eventKey: {startsWith: `loan:${currentLoan.id}:due:`}}}), 1, 'milestone reminder deduplicates');
  const notice = await prisma.notification.findFirst({where: {userId: owner, emailDelivery: 'PENDING'}});
  assert.equal(notice.whatsappDelivery, 'MANUAL');
  await service.addEBook(owner, {bookId: books[1].id});
  await service.addEBook(owner, {bookId: books[1].id});
  await service.openEBook(owner, books[1].id);
  assert.equal((await service.ebooks(owner)).ebooks.length, 1);
  assert.ok((await service.ebooks(owner)).ebooks[0].lastOpenedAt);
  await service.updateProfile(owner, {name: 'Anggota Pengujian', whatsapp: '081234567890', address: 'Alamat baru'});
  await assert.rejects(service.updateProfile(owner, {role: 'ADMIN'}), /tidak boleh/);
  const summary = await service.dashboard(owner);
  assert.equal(summary.currentUser.name, 'Anggota Pengujian');
  assert.equal(summary.stats.activeLoans, 1);
  assert.equal(summary.stats.ebooks, 1);
  assert.equal(summary.stats.history, 2);
  assert.equal(summary.alerts.overdue.length, 1);
  assert.ok(summary.unreadNotifications > 0);
  await service.readAll(owner);
  assert.equal((await service.dashboard(owner)).unreadNotifications, 0);
  await service.extend(owner, currentLoan.id, {expectedDueAt: due.toISOString()});
  const invalidated = await prisma.notification.findUnique({where: {id: notice.id}});
  assert.equal(invalidated.emailDelivery, 'NOT_REQUIRED', 'extension cancels obsolete queued email');
  assert.equal(invalidated.whatsappDelivery, 'NOT_REQUIRED', 'extension cancels obsolete manual WhatsApp');
  // Scope dispatch reads and lease-recovery writes to this fixture member. Real
  // queues stay untouched and fake SMTP only records calls in memory.
  await prisma.loan.update({where: {id: currentLoan.id}, data: {dueAt: due}});
  const aged = new Date(Date.now() - 16 * 60000);
  await prisma.notification.update({where: {id: notice.id}, data: {emailDelivery: 'SENDING', emailAttemptedAt: aged, emailAttempts: 1, whatsappDelivery: 'MANUAL'}});
  const stale = [];
  for (const milestone of [-1, 0]) stale.push(await prisma.notification.create({data: {userId: owner, eventKey: `loan:${currentLoan.id}:due:${due.getTime()}:${milestone}`, title: `Stale ${milestone}`, message: 'Obsolete milestone fixture', href: '/dashboard/pinjaman', emailDelivery: milestone === -1 ? 'SENDING' : 'PENDING', emailAttemptedAt: milestone === -1 ? aged : null, emailAttempts: milestone === -1 ? 1 : 0, whatsappDelivery: 'MANUAL'}}));
  const delivered = [];
  const dispatchPrisma = {
    $transaction: prisma.$transaction.bind(prisma),
    loan: prisma.loan,
    notification: {
      findMany: args => prisma.notification.findMany({...args, where: {...args.where, userId: owner}}),
      updateMany: args => prisma.notification.updateMany({...args, where: {...args.where, userId: owner}}),
      update: args => prisma.notification.update(args),
    },
  };
  const dispatcher = new MembersService(dispatchPrisma, {isConfigured: () => true, sendMemberReminder: async (email, title) => {delivered.push({email, title}); return true;}});
  await Promise.all([dispatcher.deliverReminders(), dispatcher.deliverReminders()]);
  assert.equal(delivered.length, 1, 'only current milestone sends, recovering an aged SENDING lease once');
  const sent = await prisma.notification.findUnique({where: {id: notice.id}});
  assert.equal(sent.emailDelivery, 'SENT');
  assert.equal(sent.emailAttempts, 2);
  assert.ok(sent.emailSentAt);
  for (const row of stale) {
    const suppressed = await prisma.notification.findUnique({where: {id: row.id}});
    assert.equal(suppressed.emailDelivery, 'NOT_REQUIRED', 'old milestone email suppressed');
    assert.equal(suppressed.whatsappDelivery, 'NOT_REQUIRED', 'old milestone manual WhatsApp suppressed');
  }
  await service.finishLoan(currentLoan.id, true);
  assert.equal((await service.loans(owner)).loans[0].status, 'HILANG', 'lost books remain visible for replacement information');
  await assert.rejects(service.extend(owner, currentLoan.id, {expectedDueAt: due.toISOString()}), /pinjaman aktif/);
  assert.equal((await service.dashboard(owner)).alerts.lost.length, 1);
  assert.equal((await prisma.bookCopy.findFirst({where: {bookId: books[0].id}})).status, 'HILANG');
  console.log('PASS members: locking, duplicate, ownership, 24h expiry, pickup, concurrent extensions, returns/lost, reminders, ebooks, profile, real summary');
} finally {
  const userIds = users.map(u => u.id), bookIds = books.map(b => b.id);
  await prisma.notification.deleteMany({where: {userId: {in: userIds}}});
  await prisma.userEBook.deleteMany({where: {userId: {in: userIds}}});
  await prisma.loanExtension.deleteMany({where: {loan: {userId: {in: userIds}}}});
  await prisma.loan.deleteMany({where: {userId: {in: userIds}}});
  await prisma.reservation.deleteMany({where: {userId: {in: userIds}}});
  await prisma.bookCopy.deleteMany({where: {bookId: {in: bookIds}}});
  await prisma.book.deleteMany({where: {id: {in: bookIds}}});
  await prisma.memberProfile.deleteMany({where: {userId: {in: userIds}}});
  await prisma.user.deleteMany({where: {id: {in: userIds}}});
  await prisma.$disconnect();
}
