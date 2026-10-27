const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file) {
  const absolute = path.resolve(__dirname, file), loaded = new Module(absolute);
  loaded.paths = Module._nodeModulePaths(path.dirname(absolute));
  loaded.require = name => {
    if (name.endsWith('.css')) return { __esModule: true, default: {} };
    if (name === 'next/link') return { __esModule: true, default: ({ children, ...props }) => React.createElement('a', props, children) };
    if (name === 'next/image') return { __esModule: true, default: props => { const imageProps = { ...props }; delete imageProps.fill; return React.createElement('img', imageProps); } };
    if (name === './types') return load('types.ts');
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText, absolute);
  return loaded.exports;
}
const BookCard = load('BookCard.tsx').default;
const book = { id: 7, title: 'Literasi Hukum', author: 'Tim Perpustakaan', code: 'BK-007', type: 'FISIK', year: 2026, language: 'Indonesia', availability: 'TERSEDIA', coverUrl: '/images/landing/book-placeholder-1.svg' };
const render = props => renderToStaticMarkup(React.createElement(BookCard, { book, ...props }));

test('member catalog grid keeps title/author and real detail links while omitting secondary metadata', () => {
  for (const type of ['FISIK', 'EBOOK']) {
    const html = render({ book: { ...book, type }, member: true, variant: 'member-catalog', basePath: '/dashboard/koleksi' });
    assert.match(html, /data-member-catalog-card="true"/);
    assert.match(html, /alt="Literasi Hukum"/);
    assert.match(html, /href="\/dashboard\/koleksi\/7"/);
    assert.match(html, /data-button="primary" data-button-hover="accent"/);
    assert.match(html, />Lihat Detail<\/a>/);
    assert.doesNotMatch(html, /<small|BK-007|2026|Indonesia|Tersedia/);
  }
});
test('member catalog list retains useful metadata and an explicit text CTA', () => {
  const html = render({ member: true, variant: 'member-catalog', rowAction: true, basePath: '/dashboard/koleksi' });
  assert.match(html, /data-catalog-view="list"/);
  assert.match(html, /BK-007/);
  assert.match(html, /2026/);
  assert.match(html, /Tersedia/);
  assert.match(html, />Lihat Detail<\/a>/);
  assert.doesNotMatch(html, /data-button-shape="square"/);
});
test('public cards and member detail recommendations do not opt into the catalog variant', () => {
  const html = render({});
  assert.match(html, /href="\/koleksi\/7"/);
  assert.match(html, /alt="Sampul Literasi Hukum"/);
  assert.doesNotMatch(html, /data-member-catalog-card/);
  const related = render({ member: true, compact: true, basePath: '/dashboard/koleksi' });
  assert.match(related, /BK-007/);
  assert.match(related, /data-button="secondary"/);
  assert.doesNotMatch(related, /data-member-catalog-card/);
});
