export type OverdueBucket = 'ALL' | 'ONE_TO_THREE' | 'FOUR_TO_FOURTEEN' | 'OVER_FOURTEEN';
export function overdueDays(dueAt: Date | string | number, now?: Date | number): number;
export function overdueBucketBounds(bucket: OverdueBucket, now?: Date | number): { gte?: number; lt: number };
