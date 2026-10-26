const DAY = 86400000;
function overdueDays(dueAt, now = Date.now()) {
  const due = dueAt instanceof Date ? dueAt.getTime() : typeof dueAt === 'number' ? dueAt : Date.parse(dueAt);
  const difference = Number(now) - due;
  return Number.isFinite(difference) && difference > 0 ? Math.ceil(difference / DAY) : 0;
}
function overdueBucketBounds(bucket, now = Date.now()) {
  const instant = Number(now);
  if (bucket === 'ALL' || bucket === 'ONE_TO_THREE') return { ...(bucket === 'ONE_TO_THREE' ? { gte: instant - 3 * DAY } : {}), lt: instant };
  if (bucket === 'FOUR_TO_FOURTEEN') return { gte: instant - 14 * DAY, lt: instant - 3 * DAY };
  if (bucket === 'OVER_FOURTEEN') return { lt: instant - 14 * DAY };
  throw new Error('Tingkat keterlambatan tidak valid.');
}
module.exports = { overdueDays, overdueBucketBounds };
