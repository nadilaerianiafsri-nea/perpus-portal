const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const api = fs.existsSync('shared/adminNotificationTarget.cjs') ? require('./adminNotificationTarget.cjs') : {};

test('explicit notification entities open audited detail routes, with metadata preferred over legacy href', () => {
  assert.equal(typeof api.adminNotificationTarget, 'function');
  for (const [entityType, href] of [
    ['RESERVATION','/admin/transaksi/reservasi/23'], ['LOAN','/admin/transaksi/peminjaman/23'],
    ['LOST_BOOK','/admin/transaksi/buku-hilang-penggantian/23'], ['GRANT','/admin/hibah-buku/23'],
    ['MEMBER','/admin/keanggotaan/23'], ['EBOOK_LOAN','/admin/transaksi/e-book/23?jenis=akses'],
    ['EBOOK_QUEUE','/admin/transaksi/e-book/23?jenis=antrean'],
  ]) assert.equal(api.adminNotificationTarget({entityType,entityId:23,href:'/admin/notifikasi'}),href);
});
test('event metadata uses stable keys, never notification title or member-facing href', () => {
  assert.equal(typeof api.notificationEntity, 'function');
  for (const [eventKey, entityType, entityId] of [
    ['reservation:23:created','RESERVATION',23], ['loan:15:due:1790000000000:2','LOAN',15],
    ['loan:7:lost-report','LOST_BOOK',7], ['ebook:loan:12:expired','EBOOK_LOAN',12],
    ['ebook:queue:14:offered','EBOOK_QUEUE',14],
  ]) assert.deepEqual(api.notificationEntity(eventKey),{entityType,entityId});
  assert.deepEqual(api.notificationEntity('unknown'),{entityType:null,entityId:null});
});
test('old safe admin targets survive while untrusted and malformed routes cannot navigate', () => {
  assert.equal(typeof api.adminNotificationTarget, 'function');
  assert.equal(api.adminNotificationTarget({href:'/admin/transaksi/reservasi'}),'/admin/transaksi/reservasi');
  assert.equal(api.adminNotificationTarget({href:'/admin/hibah-buku/8'}),'/admin/hibah-buku/8');
  for(const href of ['https://evil.test','//evil.test','/admin/../login','/admin/%2f%2fevil.test','/dashboard/pinjaman/7','javascript:alert(1)','/admin/transaksi/e-book/4','/admin/transaksi/e-book/4?jenis=evil','/admin/transaksi/peminjaman/4?returnUrl=https://evil.test']) assert.equal(api.adminNotificationTarget({href}),null);
  for(const entityId of [0,-1,2.5,'12x',2147483648]) assert.equal(api.adminNotificationTarget({entityType:'LOAN',entityId}),null);
});
