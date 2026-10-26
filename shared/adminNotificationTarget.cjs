const paths = {
  RESERVATION: '/admin/transaksi/reservasi',
  LOAN: '/admin/transaksi/peminjaman',
  LOST_BOOK: '/admin/transaksi/buku-hilang-penggantian',
  GRANT: '/admin/hibah-buku',
  MEMBER: '/admin/keanggotaan',
};
function validId(value) {
  return (typeof value === 'string' || typeof value === 'number') && /^\d+$/.test(String(value))
    && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647;
}
function notificationEntity(eventKey) {
  const key = typeof eventKey === 'string' ? eventKey : '';
  const match = /^(reservation|loan):(\d+):/.exec(key);
  if (match && validId(match[2])) return {
    entityType: match[1] === 'reservation' ? 'RESERVATION' : /^loan:\d+:(?:lost-report|lost-completed|lost)$/.test(key) ? 'LOST_BOOK' : 'LOAN',
    entityId: Number(match[2]),
  };
  const ebook = /^ebook:(loan|queue):(\d+):/.exec(key);
  if (ebook && validId(ebook[2])) return { entityType: ebook[1] === 'loan' ? 'EBOOK_LOAN' : 'EBOOK_QUEUE', entityId: Number(ebook[2]) };
  return { entityType: null, entityId: null };
}
function adminNotificationTarget({ entityType, entityId, href } = {}) {
  if (validId(entityId)) {
    const id = Number(entityId);
    if (Object.hasOwn(paths, entityType)) return `${paths[entityType]}/${id}`;
    if (entityType === 'EBOOK_LOAN' || entityType === 'EBOOK_QUEUE') return `/admin/transaksi/e-book/${id}?jenis=${entityType === 'EBOOK_LOAN' ? 'akses' : 'antrean'}`;
  }
  if (typeof href !== 'string') return null;
  if ([...Object.values(paths), '/admin/transaksi/terlambat', '/admin/transaksi/e-book'].includes(href)) return href;
  const detail = /^(\/admin\/(?:transaksi\/(?:reservasi|peminjaman|buku-hilang-penggantian)|hibah-buku|keanggotaan))\/(\d+)$/.exec(href);
  if (detail && validId(detail[2])) return href;
  const ebook = /^\/admin\/transaksi\/e-book\/(\d+)\?jenis=(akses|antrean)$/.exec(href);
  return ebook && validId(ebook[1]) ? href : null;
}
module.exports = { notificationEntity, adminNotificationTarget };
