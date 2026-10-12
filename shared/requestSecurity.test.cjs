const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readLimitedText, assertSameOrigin, requestErrorResponse } = require('./requestSecurity.cjs');

test('streaming body limits count bytes even without Content-Length', async () => {
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(5)); controller.enqueue(new Uint8Array(5)); controller.close(); } });
  const request = new Request('http://localhost/api/contact', { method: 'POST', body, duplex: 'half' });
  await assert.rejects(() => readLimitedText(request, 8), error => error.status === 413);
});
test('UTF-8 passwords and JSON bytes stay unchanged below the limit', async () => {
  const body = JSON.stringify({ password: " <A&'Ωbcdef> " });
  const request = new Request('http://localhost/api/auth/login', { method: 'POST', body });
  assert.equal(await readLimitedText(request, 200), body);
});
test('cross-origin writes are rejected before reading or proxying a body', () => {
  const foreign = new Request('https://perpus.example/api/auth/login', { method: 'POST', headers: { Origin: 'https://attacker.example' } });
  assert.throws(() => assertSameOrigin(foreign), error => requestErrorResponse(error)?.status === 403);
  const same = new Request('https://perpus.example/api/auth/login', { method: 'POST', headers: { Origin: 'https://perpus.example' } });
  assert.doesNotThrow(() => assertSameOrigin(same));
  assert.doesNotThrow(() => assertSameOrigin(new Request('https://perpus.example/api/auth/login', { method: 'POST' })));
});
