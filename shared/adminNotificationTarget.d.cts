export type NotificationEntityType = 'RESERVATION' | 'LOAN' | 'LOST_BOOK' | 'GRANT' | 'MEMBER' | 'EBOOK_LOAN' | 'EBOOK_QUEUE';
export type NotificationTarget = { entityType?: NotificationEntityType | string | null; entityId?: number | string | null; href?: string | null };
export function notificationEntity(eventKey: string): { entityType: NotificationEntityType | null; entityId: number | null };
export function adminNotificationTarget(target?: NotificationTarget): string | null;
