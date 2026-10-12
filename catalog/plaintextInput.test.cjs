const assert = require('node:assert/strict');
const { test } = require('node:test');
test('public form errors reject markup and preserve ordinary search punctuation', () => {
  const { plaintextError } = require('./plaintextInput.cjs');
  for (const input of ['<img src=x>', '<script>alert(1)</script>', '&lt;svg&gt;'])
    assert.equal(plaintextError(input), 'HTML tidak diperbolehkan pada kolom ini.');
  for (const input of ["O'Connor", 'R&D', 'Hukum & HAM', "' OR 1=1 --", '2 < 3']) assert.equal(plaintextError(input), null);
});
