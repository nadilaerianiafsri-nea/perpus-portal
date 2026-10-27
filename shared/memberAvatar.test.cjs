const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_PROFILE_PHOTO_BYTES, getInitials, profilePhotoFileError, profilePhotoUrl } = require('./memberAvatar.cjs');

test('initials use first and last words, preserve Unicode characters, and handle missing names', () => {
  for (const [name, initials] of [
    ['NAJWA AZIZI', 'NA'], ['Dila Riani', 'DR'], ['Nadila Eriani Afsri', 'NA'],
    ['Najwa', 'NA'], ['A', 'A'], ['  Najwa\tAzizi  ', 'NA'], ['𐐨na', '𐐀N'],
    ['', '?'], ['  ', '?'], [null, '?'], [undefined, '?'],
  ]) assert.equal(getInitials(name), initials);
});

test('file validation accepts only matching raster MIME and extension within 5 MB', () => {
  assert.equal(MAX_PROFILE_PHOTO_BYTES, 5 * 1024 * 1024);
  for (const [name, type] of [['photo.jpg', 'image/jpeg'], ['PHOTO.JPEG', 'image/jpeg'], ['photo.png', 'image/png'], ['photo.webp', 'image/webp']]) {
    assert.equal(profilePhotoFileError({ name, type, size: MAX_PROFILE_PHOTO_BYTES }), null);
  }
});

test('file validation rejects executable formats, MIME mismatch, unsafe filenames and invalid sizes', () => {
  for (const [name, type] of [
    ['photo.svg', 'image/svg+xml'], ['photo.html', 'text/html'], ['photo.jpg', 'text/plain'],
    ['photo.png', 'image/jpeg'], ['photo.jpg.exe', 'image/jpeg'], ['../photo.jpg', 'image/jpeg'],
    ['..\\photo.jpg', 'image/jpeg'], ['photo\0.jpg', 'image/jpeg'], ['', 'image/jpeg'],
  ]) assert.ok(profilePhotoFileError({ name, type, size: 20 }), name);
  for (const size of [0, -1, NaN, Infinity, 0.5, MAX_PROFILE_PHOTO_BYTES + 1]) {
    assert.ok(profilePhotoFileError({ name: 'photo.jpg', type: 'image/jpeg', size }));
  }
});

test('profile photo URLs map only generated local UUIDv4 raster references', () => {
  const id = 'c48be532-c202-4688-b285-ea52e491902f';
  for (const ext of ['jpg', 'png', 'webp']) {
    assert.equal(profilePhotoUrl(`/uploads/avatars/${id}.${ext}`), `/api/members/me/profile/photo/${id}.${ext}`);
  }
  for (const reference of [null, undefined, '', 'javascript:alert(1)', 'https://evil.test/x.jpg',
    `//evil.test/uploads/avatars/${id}.jpg`, `/uploads/covers/${id}.jpg`, `/uploads/avatars/../${id}.jpg`,
    `/uploads/avatars/%2e%2e/${id}.jpg`, `/uploads/avatars/${id}.svg`, `/uploads/avatars/${id}.jpg?x=1`,
    `/uploads/avatars/${id}.jpg#x`, '/uploads/avatars/c48be532-c202-1688-b285-ea52e491902f.jpg',
    `/uploads/avatars/${id}.jpg\n`, `/uploads/avatars/${id}.jpg/extra`,
  ]) assert.equal(profilePhotoUrl(reference), null, String(reference));
});
