const { test } = require('node:test');
const assert = require('node:assert/strict');
const { safeCoverUrl, safeEBookUrl, localReaderSource } = require('./displayUrls.cjs');

test('old malicious stored URLs never become rendered links or image sources', () => {
  for (const input of ['javascript:alert(1)', 'data:text/html,test', 'vbscript:x', '//evil.example/a', '/\\evil.example/a', '/uploads/covers/evil.svg']) {
    assert.equal(safeCoverUrl(input), '/images/landing/book-placeholder-1.svg');
    assert.equal(safeEBookUrl(input), null);
    assert.equal(localReaderSource(input), null);
  }
});

test('trusted static assets, generated uploads and HTTPS sources still work', () => {
  for (const input of ['/images/landing/book-placeholder-1.svg', '/uploads/covers/12345678-1234-4234-8234-123456789abc.png', 'https://example.test/cover.png']) assert.equal(safeCoverUrl(input), input);
  for (const input of ['/ebooks/contoh-1.html', '/files/book.pdf', 'https://example.test/book.pdf']) assert.equal(safeEBookUrl(input), input);
  assert.equal(localReaderSource('/ebooks/contoh-1.html'), '/ebooks/contoh-1.html');
  assert.equal(localReaderSource('https://example.test/book.pdf'), null);
  assert.equal(localReaderSource('/ebooks/../untrusted.html'), null);
});
