import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const loaded = { exports: {} };
const code = ts.transpileModule(fs.readFileSync(new URL('./period.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
new Function('exports', 'module', code)(loaded.exports, loaded);
const { createPeriod, validatePeriodRange, formatPeriodRange, jakartaDateInput } = loaded.exports;

test('presets use WIB dates across UTC day, month, and year boundaries', () => {
  const instant = new Date('2026-12-31T17:05:00Z');
  assert.equal(jakartaDateInput(instant), '2027-01-01');
  assert.deepEqual(createPeriod('today', instant), { preset: 'today', from: '2027-01-01', to: '2027-01-01' });
  assert.deepEqual(createPeriod('this-month', instant), { preset: 'this-month', from: '2027-01-01', to: '2027-01-01' });
  assert.deepEqual(createPeriod('this-week', instant), { preset: 'this-week', from: '2026-12-28', to: '2027-01-01' });
});

test('calendar week starts on Monday, including Sunday and Monday WIB boundaries', () => {
  assert.equal(createPeriod('this-week', new Date('2026-10-18T10:00:00Z')).from, '2026-10-12');
  assert.equal(createPeriod('this-week', new Date('2026-10-18T17:00:00Z')).from, '2026-10-19');
  assert.equal(createPeriod('this-month', new Date('2024-02-28T17:00:00Z')).to, '2024-02-29');
});

test('custom dates reject missing, impossible, reversed, future, or oversized ranges', () => {
  assert.ok(validatePeriodRange('', '2026-10-19'));
  assert.ok(validatePeriodRange('2026-02-30', '2026-03-01'));
  assert.equal(validatePeriodRange('2026-10-20', '2026-10-19'), 'Tanggal mulai tidak boleh melebihi tanggal akhir.');
  assert.ok(validatePeriodRange('2026-10-01', '2026-10-20', { maxDate: '2026-10-19' }));
  assert.ok(validatePeriodRange('2025-01-01', '2026-10-19'));
  assert.equal(validatePeriodRange('2024-01-01', '2024-12-31'), '');
  assert.equal(validatePeriodRange('2026-10-19', '2026-10-19'), '');
});

test('active labels remain clear within a month and across years', () => {
  assert.equal(formatPeriodRange({ from: '2026-10-01', to: '2026-10-19' }), '1–19 Okt 2026');
  assert.match(formatPeriodRange({ from: '2026-12-28', to: '2027-01-01' }), /2026.*2027/);
});
