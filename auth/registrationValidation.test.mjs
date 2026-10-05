import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./registrationValidation.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { validateRegistration } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const valid = { name: 'Najwa', email: 'najwa@example.com', whatsapp: '+62 812-3456-7890', address: 'Pekanbaru', identity: '00123', university: '', division: '', password: 'password123', confirmPassword: 'password123', consent: true };

test('accepts general membership, text identity, and ordinary email for employees', () => {
  assert.deepEqual(validateRegistration(valid, 'umum'), {});
  assert.deepEqual(validateRegistration({ ...valid, division: 'Administrasi' }, 'pegawai'), {});
});
test('rejects whitespace-only required values', () => {
  const errors = validateRegistration({ ...valid, name: ' ', whatsapp: ' ', address: ' ', identity: ' ' }, 'umum');
  for (const field of ['name', 'whatsapp', 'address', 'identity']) assert.ok(errors[field]);
});
test('checks email, minimum password, confirmation and consent independently', () => {
  const errors = validateRegistration({ ...valid, email: 'bad@', password: 'short', confirmPassword: 'different', consent: false }, 'umum');
  for (const field of ['email', 'password', 'confirmPassword', 'consent']) assert.ok(errors[field]);
});
test('requires only the additional field for the selected membership', () => {
  assert.ok(validateRegistration(valid, 'mahasiswa').university);
  assert.ok(validateRegistration(valid, 'pegawai').division);
  assert.deepEqual(validateRegistration({ ...valid, university: 'Universitas Riau' }, 'mahasiswa'), {});
});
