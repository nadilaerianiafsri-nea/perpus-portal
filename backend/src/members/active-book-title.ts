const DAY = 86_400_000;

export function normalizeBookTitle(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');
}

export function sameBookTitle(left: string, right: string) {
  return normalizeBookTitle(left) === normalizeBookTitle(right);
}

export function isEBookAccessActive(
  addedAt: Date,
  accessDurationDays: number | null,
  now = new Date(),
) {
  return (
    accessDurationDays === null ||
    addedAt.getTime() + accessDurationDays * DAY > now.getTime()
  );
}
