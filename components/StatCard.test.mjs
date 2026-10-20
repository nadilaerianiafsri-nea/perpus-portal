import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function load(file) {
  const absolute = path.resolve(file), loaded = new Module(absolute);
  loaded.paths = Module._nodeModulePaths(path.dirname(absolute));
  loaded.require = name => {
    if (name.endsWith('.css')) return { __esModule: true, default: {} };
    if (name.startsWith('@/')) return load(name.slice(2) + '.tsx');
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, absolute);
  return loaded.exports.default;
}

const StatCard = load('components/StatCard.tsx');
const base = { label: 'E-Book Saya', value: '1.234', tone: 'yellow', icon: React.createElement('svg') };
const render = (props = {}) => renderToStaticMarkup(React.createElement(StatCard, { ...base, ...props }));

test('a static statistic preserves the supplied display value and is not a keyboard action', () => {
  const html = render({ detail: '1–20 Okt 2026', 'aria-label': 'Ringkasan bacaan' });
  assert.match(html, /^<article /);
  assert.match(html, /aria-label="Ringkasan bacaan"/);
  assert.match(html, /aria-hidden="true"><svg/);
  assert.match(html, /E-Book Saya/);
  assert.match(html, />1\.234<\/strong>/);
  assert.match(html, /1–20 Okt 2026/);
  assert.doesNotMatch(html, /href=|tabindex=|role="button"/);
});

test('a linked statistic retains its destination and accessible label', () => {
  const html = render({ href: '/dashboard/e-book', 'aria-label': 'Buka E-Book Saya' });
  assert.match(html, /^<a /);
  assert.match(html, /href="\/dashboard\/e-book"/);
  assert.match(html, /aria-label="Buka E-Book Saya"/);
});

test('loading and stock presentation can pass through without changing data', () => {
  const value = React.createElement('span', { 'aria-label': 'Memuat statistik' }, '…');
  const html = render({ value, children: React.createElement('progress', { value: 2, max: 4 }) });
  assert.match(html, /aria-label="Memuat statistik"/);
  assert.match(html, /<progress value="2" max="4"/);
});

test('AdminStatCard retains existing semantics, routes, and data hooks through the shared card', () => {
  const AdminStatCard = load('admin/AdminStatCard.tsx');
  const html = renderToStaticMarkup(React.createElement(AdminStatCard, {
    ...base, href: '/admin/koleksi/e-book', detail: 'Periode aktif',
  }));
  assert.match(html, /data-admin-stat="true"/);
  assert.match(html, /data-stat-card="true"/);
  assert.match(html, /data-stat-tone="yellow"/);
  assert.match(html, /href="\/admin\/koleksi\/e-book"/);
  assert.match(html, /aria-label="E-Book Saya: 1\.234\. Buka halaman terkait\."/);
});
