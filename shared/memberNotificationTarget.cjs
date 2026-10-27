function validId(value) {
  return (typeof value === 'number' || typeof value === 'string') && /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) <= 2147483647;
}
function safeMemberNotificationHref(value) {
  if (typeof value !== 'string') return null;
  if (['/dashboard', '/dashboard/reservasi', '/dashboard/pinjaman', '/dashboard/riwayat', '/dashboard/e-book', '/dashboard/notifikasi', '/dashboard/profil'].includes(value)) return value;
  const detail = /^\/dashboard\/(?:pinjaman|koleksi)\/([1-9]\d*)$/.exec(value);
  return detail && validId(detail[1]) ? value : null;
}
function memberNotificationTarget({ targetUrl, entityType, entityId, bookId, href } = {}) {
  const target = safeMemberNotificationHref(targetUrl);
  if (target) return target;
  if (['LOAN', 'LOST_BOOK'].includes(entityType) && validId(entityId)) return `/dashboard/pinjaman/${Number(entityId)}`;
  if (['EBOOK_LOAN', 'EBOOK_QUEUE'].includes(entityType)) return validId(bookId) ? `/dashboard/koleksi/${Number(bookId)}` : '/dashboard/e-book';
  if (entityType === 'RESERVATION') return href === '/dashboard/riwayat' ? href : '/dashboard/reservasi';
  return safeMemberNotificationHref(href);
}
module.exports = { safeMemberNotificationHref, memberNotificationTarget };
