import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memberNotificationTarget, safeMemberNotificationHref } from './memberNotificationTarget.cjs';

test('member targets use structured metadata for current and completed loans, never notification wording', () => {
  for (const entityType of ['LOAN', 'LOST_BOOK']) assert.equal(memberNotificationTarget({ entityType, entityId: 7, href: '/dashboard/riwayat', title: 'Anything' }), '/dashboard/pinjaman/7');
  assert.equal(memberNotificationTarget({ entityType: 'EBOOK_QUEUE', entityId: 9, bookId: 3 }), '/dashboard/koleksi/3');
  assert.equal(memberNotificationTarget({ entityType: 'EBOOK_LOAN', entityId: 9 }), '/dashboard/e-book');
  assert.equal(memberNotificationTarget({ entityType: 'RESERVATION', entityId: 4 }), '/dashboard/reservasi');
  assert.equal(memberNotificationTarget({ entityType: 'RESERVATION', href: '/dashboard/riwayat' }), '/dashboard/riwayat');
});
test('existing canonical targets and legacy destinations are retained', () => {
  assert.equal(memberNotificationTarget({ targetUrl: '/dashboard/koleksi/8', href: '/dashboard/e-book' }), '/dashboard/koleksi/8');
  assert.equal(memberNotificationTarget({ href: '/dashboard/pinjaman' }), '/dashboard/pinjaman');
  assert.equal(memberNotificationTarget({ href: '/dashboard/reservasi' }), '/dashboard/reservasi');
});
test('unsafe, foreign-role and malformed URLs never become member navigation', () => {
  for (const url of ['https://bad.test', '//bad.test', 'javascript:alert(1)', '/admin', '/dashboard/pinjaman/0', '/dashboard/koleksi/01', '/dashboard/koleksi/2147483648', '/dashboard/koleksi/1?next=//bad.test', '/dashboard/pinjaman/1/delete']) {
    assert.equal(safeMemberNotificationHref(url), null);
    assert.equal(memberNotificationTarget({ targetUrl: url, href: url }), null);
  }
  assert.equal(memberNotificationTarget({ title: 'Reservasi', message: 'pinjaman' }), null);
});
