import { BadRequestException } from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { overdueBucketBounds, type OverdueBucket } from '../../../shared/loanOverdue.cjs';

export const ADMIN_LOAN_QUERY_FIELDS = ['search', 'status', 'memberType', 'due', 'page', 'limit', 'bucket', 'sort', 'from', 'to'] as const;
export type OverdueQuery = { status?: string; bucket?: string; sort?: string; from?: string; to?: string };
export function overdueBucketWhere(bucket: OverdueBucket, now: Date): Prisma.LoanWhereInput {
  const bounds = overdueBucketBounds(bucket, now);
  return { dueAt: { ...(bounds.gte === undefined ? {} : { gte: new Date(bounds.gte) }), lt: new Date(bounds.lt) } };
}
export function overdueLoanOptions(input: OverdueQuery, now: Date): { where: Prisma.LoanWhereInput[]; direction: 'asc' | 'desc' } {
  const hasOptions = ['bucket', 'sort', 'from', 'to'].some(key => input[key as keyof OverdueQuery] !== undefined);
  if (input.status !== 'OVERDUE') {
    if (hasOptions) throw new BadRequestException('Filter keterlambatan hanya tersedia untuk pinjaman terlambat.');
    return { where: [], direction: 'asc' };
  }
  const bucket = input.bucket ?? 'ALL', sort = input.sort ?? 'OLDEST';
  if (!['ALL', 'ONE_TO_THREE', 'FOUR_TO_FOURTEEN', 'OVER_FOURTEEN'].includes(bucket)) throw new BadRequestException('Tingkat keterlambatan tidak valid.');
  if (sort !== 'OLDEST' && sort !== 'NEWEST') throw new BadRequestException('Urutan keterlambatan tidak valid.');
  const where = bucket === 'ALL' ? [] : [overdueBucketWhere(bucket as OverdueBucket, now)];
  if (input.from !== undefined || input.to !== undefined) {
    const valid = (value?: string) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const date = new Date(value + 'T00:00:00Z');
      return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    if (!valid(input.from) || !valid(input.to) || input.from! > input.to!) throw new BadRequestException('Rentang tanggal jatuh tempo tidak valid.');
    where.push({ dueAt: { gte: new Date(input.from + 'T00:00:00+07:00'), lt: new Date(new Date(input.to + 'T00:00:00+07:00').getTime() + 86400000) } });
  }
  return { where, direction: sort === 'OLDEST' ? 'asc' : 'desc' };
}
