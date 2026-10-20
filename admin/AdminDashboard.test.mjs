import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module, { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const testRequire = createRequire(import.meta.url);

function load(filename) {
  const absolute = path.resolve(filename);
  const loaded = new Module(absolute);
  loaded.paths = Module._nodeModulePaths(path.dirname(absolute));
  loaded.require = name => {
    if (name.endsWith('.css')) return { __esModule: true, default: {} };
    if (name.startsWith('.') || name.startsWith('@/')) {
      const target = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(absolute), name);
      if (name.endsWith('.cjs')) return testRequire(target);
      return load(['.ts', '.tsx'].map(ext => target + ext).find(file => fs.existsSync(file)));
    }
    return testRequire(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, absolute);
  return loaded.exports;
}

function render() {
  return renderToStaticMarkup(React.createElement(load('admin/AdminDashboard.tsx').default));
}

test('dashboard does not render a permanent date panel or quick-range buttons', () => {
  const html = render();
  assert.doesNotMatch(html, /type="date"|Filter Periode|7 Hari|30 Hari|Reset/);
  assert.match(html, /Memuat dashboard admin/);
});

test('shared period selector exposes the four presets with custom dates hidden initially', () => {
  const value = load('shared/period.ts').createPeriod('this-month', new Date('2026-10-20T00:00:00Z'));
  const html = renderToStaticMarkup(React.createElement(load('components/PeriodSelector.tsx').default, {
    value, onChange() {}, label: 'Periode transaksi peminjaman',
  }));
  assert.match(html, /aria-label="Periode transaksi peminjaman"/);
  assert.equal([...html.matchAll(/<option /g)].length, 4);
  assert.match(html, /value="this-month" selected=""/);
  assert.doesNotMatch(html, /type="date"|Terapkan|Reset/);
});
