import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

async function load(name) {
  const source = readFileSync(new URL(`./${name}.ts`, import.meta.url), 'utf8').replace('../shared/inputValidation.cjs', new URL('../shared/inputValidation.cjs', import.meta.url).href);
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const books = await load('adminBooks');
const ebooks = await load('adminEBooks');
const grants = await load('adminGrants');
test('forms explain HTML rejection while preserving punctuation', () => {
  for (const validate of [books.adminBookTextError, ebooks.adminEBookTextError, grants.adminGrantTextError]) {
    assert.equal(validate({ title: '<b>Hukum</b>' }), 'HTML tidak diperbolehkan pada kolom ini.');
    assert.equal(validate({ author: "O'Connor", title: 'Hukum & HAM', publisher: 'R&D' }), null);
  }
});
test('legacy dangerous image and source URLs cannot become active links', () => {
  assert.equal(books.adminCoverUrl('javascript:alert(1)'), '/images/landing/book-placeholder-1.svg');
  assert.equal(books.adminCoverUrl('/uploads/covers/a.svg'), '/images/landing/book-placeholder-1.svg');
  assert.equal(ebooks.adminEBookSourceUrl('data:text/html,x'), null);
  assert.equal(ebooks.adminEBookSourceUrl('/ebooks/contoh-literasi.html'), '/ebooks/contoh-literasi.html');
});
