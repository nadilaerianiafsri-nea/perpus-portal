import { NotFoundException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'node:crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { MembersService } from './members.service';

// Run the actual services/guard against bounded in-memory fixtures, without
// replacing their authorization logic or starting reminder/email jobs.
describe('member ownership enforced by existing service', () => {
  const dueAt = new Date('2026-10-20T00:00:00.000Z');
  let writes: number;
  let service: MembersService;
  beforeEach(() => {
    writes = 0;
    const row = { id: 7, userId: 1, bookId: 9, status: 'MENUNGGU_PENGAMBILAN', expiresAt: dueAt, dueAt, progressVersion: 0, progress: 0, book: { type: 'EBOOK' } };
    const find = async ({ where }: { where: { id?: number; userId?: number; bookId?: number } }) =>
      Object.entries(where).some(([key, value]) => ['id', 'userId', 'bookId'].includes(key) && row[key as 'id' | 'userId' | 'bookId'] !== value) ? null : row;
    const write = async () => { writes++; return row; };
    const transaction = { $queryRaw: async () => [], reservation: { findFirst: find, update: write }, loan: { findFirst: find, update: write }, userEBook: { findFirst: find, update: write }, notification: { findFirst: find, updateMany: write } };
    const prisma = { ...transaction, $transaction: async (work: (client: typeof transaction) => Promise<unknown>) => work(transaction) };
    service = new MembersService(prisma as unknown as PrismaService, {} as MailService);
  });
  it('cannot cancel a reservation owned by another member', async () => {
    await expect(service.cancel(2, 7)).rejects.toBeInstanceOf(NotFoundException);
    expect(writes).toBe(0);
  });
  it('cannot extend a loan owned by another member', async () => {
    await expect(service.extend(2, 7, { expectedDueAt: dueAt.toISOString() })).rejects.toBeInstanceOf(NotFoundException);
    expect(writes).toBe(0);
  });
  it('cannot mark another member notification read', async () => {
    await expect(service.read(2, 7)).rejects.toBeInstanceOf(NotFoundException);
    expect(writes).toBe(0);
  });
  it('can mark an owned notification read', async () => {
    await expect(service.read(1, 7)).resolves.toEqual({ success: true });
    expect(writes).toBe(1);
  });
  it('cannot update progress of another member ebook', async () => {
    await expect(service.updateEBookProgress(2, 9, { progress: 42, lastPosition: 0.42, expectedVersion: 0 })).rejects.toBeInstanceOf(NotFoundException);
    expect(writes).toBe(0);
  });
});

describe('actual JWT guard validates signed session subjects', () => {
  const secret = 'test-only-key-not-a-production-secret';
  const passwordHash = 'test-only-credential-version';
  const jwt = new JwtService({ secret });
  const config = { getOrThrow: () => secret } as unknown as ConfigService;
  const credentialVersion = createHmac('sha256', secret).update(passwordHash).digest('hex');
  const prisma = { user: { findUnique: async ({ where }: { where: { id: number } }) => where.id === 1 ? { passwordHash } : null } } as unknown as PrismaService;
  const guard = new JwtAuthGuard(prisma, jwt, config);
  function context(token: unknown) { return { switchToHttp: () => ({ getRequest: () => ({ cookies: { perpus_session: token } }) }) } as unknown as ExecutionContext; }
  it('accepts a current signed session', async () => {
    await expect(guard.canActivate(context(await jwt.signAsync({ sub: 1, credentialVersion })))).resolves.toBe(true);
  });
  it.each([0, -1, 1.5, '1', 2147483648, null])('rejects signed invalid database subject %s', async (sub) => {
    await expect(guard.canActivate(context(await jwt.signAsync({ sub, credentialVersion })))).rejects.toBeInstanceOf(UnauthorizedException);
  });
  it('rejects an invalid signature, removed user and changed credentials', async () => {
    for (const token of ['not-a-jwt', await jwt.signAsync({ sub: 2, credentialVersion }), await jwt.signAsync({ sub: 1, credentialVersion: 'old' })]) await expect(guard.canActivate(context(token))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
