export type MemberNotificationTarget = { targetUrl?: string | null; entityType?: string | null; entityId?: string | number | null; bookId?: string | number | null; href?: string | null };
export function safeMemberNotificationHref(value: unknown): string | null;
export function memberNotificationTarget(target?: MemberNotificationTarget): string | null;
