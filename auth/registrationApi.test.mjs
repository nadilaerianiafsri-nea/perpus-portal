import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./registrationApi.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { registerMember } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const values = { name: 'Budi Santoso', email: 'budi@example.com', whatsapp: '081234567890', address: 'Pekanbaru', identity: '001234', university: 'Universitas Riau', division: 'Pelayanan', password: 'passwordaman', confirmPassword: 'passwordaman', consent: true };
for (const memberType of ['umum', 'mahasiswa', 'pegawai']) {
  test(`maps only relevant ${memberType} fields and accepts HTTP 201`, async () => {
    let payload;
    const result = await registerMember(values, memberType, async (url, options) => {
      assert.equal(url, '/api/auth/register');
      assert.equal(options.method, 'POST');
      payload = JSON.parse(options.body);
      return Response.json({ data: { id: 1, email: values.email, memberType: memberType.toUpperCase(), emailVerified: false } }, { status: 201 });
    });
    assert.equal(result.success, true);
    assert.equal(payload.memberType, memberType);
    for (const field of ['name', 'email', 'whatsapp', 'address', 'identity', 'password', 'consent']) assert.equal(payload[field], values[field]);
    assert.equal(payload.university, memberType === 'mahasiswa' ? values.university : undefined);
    assert.equal(payload.division, memberType === 'pegawai' ? values.division : undefined);
    assert.equal(payload.confirmPassword, undefined);
    assert.equal(payload.role, undefined);
  });
}
test('duplicate email is returned as an email field error', async () => {
  const result = await registerMember(values, 'umum', async () => Response.json({}, { status: 409 }));
  assert.equal(result.success, false);
  assert.equal(result.errors.email, 'Email sudah terdaftar.');
});
test('backend validation maps known fields and does not expose unknown raw data', async () => {
  const result = await registerMember(values, 'umum', async () => Response.json({ message: 'Data registrasi tidak valid.', errors: { whatsapp: 'Maksimal 32 karakter.', role: 'internal', password: { stack: 'private' } } }, { status: 400 }));
  assert.equal(result.success, false);
  assert.deepEqual(result.errors, { whatsapp: 'Maksimal 32 karakter.' });
});
test('network and 503 errors show a friendly server message', async () => {
  for (const fetcher of [async () => { throw new Error('private stack'); }, async () => Response.json({ message: 'raw internal exception' }, { status: 503 })]) {
    const result = await registerMember(values, 'umum', fetcher);
    assert.equal(result.success, false);
    assert.equal(result.message, 'Server tidak dapat dihubungi. Silakan coba lagi.');
  }
});
test('malformed server response is handled without exposing HTML or exceptions', async () => {
  const result = await registerMember(values, 'umum', async () => new Response('<html>internal failure</html>', { status: 500 }));
  assert.equal(result.success, false);
  assert.ok(!result.message.includes('<html>'));
});
