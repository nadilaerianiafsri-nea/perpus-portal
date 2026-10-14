import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('./registrationValidation.ts', import.meta.url), 'utf8')
  .replace('../catalog/plaintextInput.cjs', new URL('../catalog/plaintextInput.cjs', import.meta.url).href);
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { validateRegistration } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

const valid = {
  name: 'Najwa',
  email: 'najwa@example.com',
  whatsapp: '081234567890',
  address: 'Pekanbaru',
  identity: '1471012345678901',
  university: '',
  division: '',
  password: 'password123',
  confirmPassword: 'password123',
  consent: true,
};

test('accepts valid general membership with 16 digit NIK and numeric WhatsApp', () => {
  assert.deepEqual(validateRegistration(valid, 'umum'), {});
  assert.deepEqual(validateRegistration({ ...valid, whatsapp: '6281234567890' }, 'umum'), {});
});

test('rejects invalid NIK length or non-numeric NIK for general membership', () => {
  for (const identity of ['147101234567890', '14710123456789012', '14710123456789A1']) {
    assert.equal(validateRegistration({ ...valid, identity }, 'umum').identity, 'NIK/KTP harus tepat 16 digit angka.');
  }
});

test('rejects WhatsApp letters, punctuation, and unsupported prefixes', () => {
  for (const whatsapp of ['+6281234567890', '0812-3456-7890', '0812abc7890', '071234567890']) {
    assert.ok(validateRegistration({ ...valid, whatsapp }, 'umum').whatsapp);
  }
});

test('keeps student and employee identity fields text-capable', () => {
  assert.deepEqual(
    validateRegistration({ ...valid, identity: 'NIM-2026/A', university: 'Universitas Riau' }, 'mahasiswa'),
    {},
  );
  assert.deepEqual(
    validateRegistration({ ...valid, identity: 'NIP-ABC-2026', division: 'Administrasi' }, 'pegawai'),
    {},
  );
});

test('rejects markup and overlong plaintext while leaving passwords and ordinary punctuation intact', () => {
  for (const name of ['<script>alert(1)</script>', '<b>Nama</b>', '&lt;svg&gt;']) {
    assert.ok(validateRegistration({ ...valid, name }, 'umum').name);
  }
  assert.ok(validateRegistration({ ...valid, identity: '1'.repeat(192) }, 'umum').identity);
  const password = " <A&'bcdef> ";
  assert.deepEqual(
    validateRegistration({ ...valid, name: "O'Connor", address: 'R&D / Hukum & HAM', password, confirmPassword: password }, 'umum'),
    {},
  );
  assert.ok(validateRegistration({ ...valid, password: 'a'.repeat(73), confirmPassword: 'a'.repeat(73) }, 'umum').password);
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
  assert.ok(validateRegistration({ ...valid, identity: 'NIM-2026/A' }, 'mahasiswa').university);
  assert.ok(validateRegistration({ ...valid, identity: 'NIP-ABC-2026' }, 'pegawai').division);
});
