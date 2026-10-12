const { test } = require('node:test');
const assert = require('node:assert/strict');
const { containsHtml, textInputError, isSafeUrl, escapeHtml } = require('./inputValidation.cjs');

test('HTML tags, handlers, comments and incomplete tags are rejected', () => {
  for (const value of ['<p>test</p>', '<script>alert(1)</script>', '<img src=x onerror=alert(1)>', '<svg onload=alert(1)>', '<a href="javascript:alert(1)">test</a>', '<div onclick="alert(1)">test</div>', '<!-- comment -->', '<!DOCTYPE html>', '<img src=x', '<custom-element>test</custom-element>']) {
    assert.equal(containsHtml(value), true, value);
    assert.equal(textInputError(value), 'Input tidak boleh mengandung HTML.', value);
  }
});
test('normal punctuation and SQL-looking text remain data', () => {
  for (const value of ["O'Connor", 'R&D', 'Hukum & HAM', 'Jl. Jend. Sudirman No.233', 'Universitas Islam Negeri', '0811-6904-422', '2 < 3 dan 5 > 4', "' OR '1'='1", "'; DROP TABLE users; --", '&lt;p&gt;test&lt;/p&gt;']) {
    if (value.startsWith('&lt;')) {
      assert.equal(containsHtml(value), true, value);
    } else {
      assert.equal(containsHtml(value), false, value);
      assert.equal(textInputError(value), null, value);
    }
  }
});
test('standalone closing tags and unterminated tag names are markup too', () => {
  for (const value of ['</script>', '<script', '</custom-element>', '<img']) assert.equal(containsHtml(value), true, value);
});
test('plain text validates type, bounds and controls without altering input', () => {
  for (const value of [undefined, null, {}, [], 12, true, '']) assert.ok(textInputError(value));
  assert.equal(textInputError('', { required: false }), null);
  assert.ok(textInputError('abcd', { max: 3 }));
  assert.ok(textInputError('hello\r\nBcc: attacker@example.com'));
  assert.equal(textInputError('hello\nworld', { multiline: true }), null);
  assert.ok(textInputError('hello\u0000world', { multiline: true }));
});
test('URL protocols, host credentials, controls and relative origin are constrained', () => {
  for (const value of ['https://example.com/book.pdf', 'http://example.com/book?a=1&b=2']) assert.equal(isSafeUrl(value), true);
  for (const value of ['javascript:alert(1)', 'data:text/html,<script>x</script>', 'vbscript:x', '//evil.example/a', '/\\evil.example/a', 'https://user:pass@example.com', 'https://example.com/\r\nx', 'https://example.com/%0aevil', 'https://example.com/<img>']) assert.equal(isSafeUrl(value, { allowRelative: true }), false, value);
  assert.equal(isSafeUrl('/uploads/covers/book.png', { allowRelative: true }), true);
  assert.equal(isSafeUrl('/dashboard/pinjaman', { allowRelative: true }), true);
  assert.equal(isSafeUrl('/uploads/covers/book.png'), false);
});
test('output encoding escapes every HTML delimiter exactly once per call', () => {
  assert.equal(escapeHtml('<p>"O\'Connor" & R&D</p>'), '&lt;p&gt;&quot;O&#39;Connor&quot; &amp; R&amp;D&lt;/p&gt;');
});
