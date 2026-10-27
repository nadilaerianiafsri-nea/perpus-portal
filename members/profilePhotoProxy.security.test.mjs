import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./profilePhotoProxy.ts', import.meta.url), 'utf8')
  .replace(/import 'server-only';\s*/g, '')
  .replace(/import \{ API_URL \} from '@\/catalog\/serverApi';/, "const API_URL = 'http://backend.test';")
  .replaceAll('@/shared/requestSecurity.cjs', new URL('../shared/requestSecurity.cjs', import.meta.url).href)
  .replaceAll('@/shared/memberAvatar.cjs', new URL('../shared/memberAvatar.cjs', import.meta.url).href);
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { memberProfilePhotoProxy, memberProfilePhotoReadProxy } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const filename = 'c48be532-c202-4688-b285-ea52e491902f.jpg';
const baseUrl = 'http://frontend.test/api/members/me/profile/photo';
const cookie = 'unrelated=secret; perpus_session=session-token; admin=other';
const multipartHeaders = { cookie, 'content-type': 'multipart/form-data; boundary=photo-boundary' };

function request(method, { headers = multipartHeaders, body, query = '' } = {}) {
  return new Request(`${baseUrl}${query}`, { method, headers, body });
}

async function withBackend(response, run) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (...args) => { calls.push(args); return response(); };
  try { await run(calls); } finally { globalThis.fetch = originalFetch; }
}

test('photo mutations require a session and same-origin request before contacting backend', async () => {
  await withBackend(() => Response.json({ profile: {} }), async (calls) => {
    assert.equal((await memberProfilePhotoProxy(request('POST', { headers: { 'content-type': multipartHeaders['content-type'] }, body: 'x' }))).status, 401);
    assert.equal((await memberProfilePhotoProxy(request('POST', { headers: { ...multipartHeaders, cookie: 'perpus_session=' }, body: 'x' }))).status, 401);
    assert.equal((await memberProfilePhotoProxy(request('POST', { headers: { ...multipartHeaders, origin: 'https://evil.test' }, body: 'x' }))).status, 403);
    assert.equal((await memberProfilePhotoProxy(request('DELETE', { headers: { cookie, 'sec-fetch-site': 'cross-site' } }))).status, 403);
    assert.equal(calls.length, 0);
  });
});

test('upload forwards unchanged multipart bytes to a fixed target with only session cookie', async () => {
  const body = '--photo-boundary\r\nContent-Disposition: form-data; name="photo"; filename="photo.jpg"\r\nContent-Type: image/jpeg\r\n\r\nimage\r\n--photo-boundary--\r\n';
  await withBackend(() => Response.json({ profile: { profileImageUrl: `/uploads/avatars/${filename}` } }), async (calls) => {
    const response = await memberProfilePhotoProxy(request('POST', { body, headers: { ...multipartHeaders, authorization: 'Bearer arbitrary', 'x-user-id': '2' } }));
    assert.equal(response.status, 200);
    assert.equal((await response.json()).profile.profileImageUrl, `/uploads/avatars/${filename}`);
    assert.equal(String(calls[0][0]), 'http://backend.test/members/me/profile/photo');
    const forwarded = calls[0][1];
    assert.equal(forwarded.method, 'POST');
    assert.equal(new TextDecoder().decode(forwarded.body), body);
    assert.equal(new Headers(forwarded.headers).get('cookie'), 'perpus_session=session-token');
    assert.equal(new Headers(forwarded.headers).get('authorization'), null);
    assert.equal(new Headers(forwarded.headers).get('x-user-id'), null);
    assert.equal(new Headers(forwarded.headers).get('content-type'), multipartHeaders['content-type']);
    assert.equal(forwarded.redirect, 'error');
    assert.match(response.headers.get('cache-control'), /private/);
  });
});

test('upload rejects query identity, arbitrary queries, non-multipart and oversized envelopes', async () => {
  await withBackend(() => Response.json({ profile: {} }), async (calls) => {
    for (const query of ['?userId=2', '?anything=x']) {
      assert.equal((await memberProfilePhotoProxy(request('POST', { query, body: 'x' }))).status, 400);
    }
    for (const contentType of ['application/json', 'multipart/form-data', 'multipart/form-data; boundary=']) {
      assert.equal((await memberProfilePhotoProxy(request('POST', { headers: { cookie, 'content-type': contentType }, body: 'x' }))).status, 400);
    }
    assert.equal((await memberProfilePhotoProxy(request('POST', { headers: { ...multipartHeaders, 'content-length': String(6 * 1024 * 1024 + 1) }, body: 'x' }))).status, 413);
    assert.equal((await memberProfilePhotoProxy(request('POST', { body: new Uint8Array(6 * 1024 * 1024 + 1) }))).status, 413);
    assert.equal(calls.length, 0);
  });
});

test('delete accepts empty body or object, and rejects arbitrary identity or malformed payloads', async () => {
  await withBackend(() => Response.json({ profile: { profileImageUrl: null } }), async (calls) => {
    for (const body of [undefined, '{}', '  { }  ']) {
      assert.equal((await memberProfilePhotoProxy(request('DELETE', { headers: { cookie, 'content-type': 'application/json' }, body }))).status, 200);
    }
    assert.equal(calls.length, 3);
    for (const [, options] of calls) {
      assert.equal(options.method, 'DELETE');
      assert.equal(options.body, undefined);
    }
    for (const body of ['{"userId":2}', '[]', 'null', '""', 'invalid', 'x'.repeat(1025)]) {
      const response = await memberProfilePhotoProxy(request('DELETE', { headers: { cookie }, body }));
      assert.ok([400, 413].includes(response.status), body);
    }
    assert.equal(calls.length, 3);
    assert.equal((await memberProfilePhotoProxy(request('PATCH', { body: '{}' }))).status, 405);
  });
});

test('private photo reads require session, safe filename, and no arbitrary query', async () => {
  await withBackend(() => new Response('image', { headers: { 'content-type': 'image/jpeg' } }), async (calls) => {
    const read = (name, headers = { cookie }, query = '') => memberProfilePhotoReadProxy(new Request(`${baseUrl}/${name}${query}`, { headers }), name);
    assert.equal((await read(filename, {})).status, 401);
    for (const name of ['../photo.jpg', '%2e%2e.jpg', 'photo.svg', 'https://evil.test/x.jpg', `${filename}\n`, filename.replace('-4688-', '-1688-')]) {
      assert.equal((await read(name)).status, 400, name);
    }
    assert.equal((await read(filename, { cookie }, '?userId=2')).status, 400);
    assert.equal(calls.length, 0);
    const response = await read(filename);
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'image');
    assert.equal(String(calls[0][0]), `http://backend.test/members/me/profile/photo/${filename}`);
    assert.equal(new Headers(calls[0][1].headers).get('cookie'), 'perpus_session=session-token');
    assert.equal(response.headers.get('content-type'), 'image/jpeg');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(response.headers.get('content-security-policy'), /default-src 'none'/);
    assert.match(response.headers.get('cache-control'), /private/);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(calls[0][1].redirect, 'error');
  });
});

test('private reads permit only expected raster MIME and preserve backend ownership failures', async () => {
  for (const [extension, mime] of [['jpg', 'image/jpeg'], ['png', 'image/png'], ['webp', 'image/webp']]) {
    await withBackend(() => new Response('image', { headers: { 'content-type': mime } }), async () => {
      assert.equal((await memberProfilePhotoReadProxy(new Request(baseUrl, { headers: { cookie } }), filename.replace('.jpg', `.${extension}`))).status, 200);
    });
  }
  for (const mime of ['image/svg+xml', 'text/html', 'image/png', '']) {
    await withBackend(() => new Response('<script>x</script>', { headers: { 'content-type': mime } }), async () => {
      const response = await memberProfilePhotoReadProxy(new Request(baseUrl, { headers: { cookie } }), filename);
      assert.equal(response.status, 502);
      assert.doesNotMatch(await response.text(), /<script>/);
    });
  }
  await withBackend(() => Response.json({ message: 'Forbidden' }, { status: 403 }), async () => {
    const response = await memberProfilePhotoReadProxy(new Request(baseUrl, { headers: { cookie } }), filename);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).message, 'Forbidden');
    assert.match(response.headers.get('cache-control'), /private/);
  });
});
