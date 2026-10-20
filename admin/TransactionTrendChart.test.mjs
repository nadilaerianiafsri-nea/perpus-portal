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
  const absolute = path.resolve(filename), loaded = new Module(absolute);
  loaded.paths = Module._nodeModulePaths(path.dirname(absolute));
  loaded.require = name => {
    if (name.endsWith('.css')) return { __esModule: true, default: {} };
    if (name.endsWith('.cjs') && name.startsWith('@/')) return testRequire(path.resolve(name.slice(2)));
    return testRequire(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, absolute);
  return loaded.exports.default;
}

test('daily chart keeps every real/zero bucket and both series when axis labels are thinned', () => {
  const rows = Array.from({ length: 20 }, (_, i) => ({ key: `2026-10-${String(i + 1).padStart(2, '0')}`, label: `${i + 1} Okt`, tooltipLabel: `${i + 1} Okt 2026`, borrowings: i === 19 ? 2 : 0, returns: i === 19 ? 1 : 0 }));
  const html = renderToStaticMarkup(React.createElement(load('admin/TransactionTrendChart.tsx'), { rows, granularity: 'day' }));
  assert.equal([...html.matchAll(/data-trend-key=/g)].length, 20);
  assert.equal([...html.matchAll(/<circle /g)].length, 40);
  assert.equal([...html.matchAll(/<polyline /g)].length, 2);
  assert.match(html, /20 Okt 2026: 2 peminjaman, 1 pengembalian/);
  assert.match(html, /2 Okt 2026: 0 peminjaman, 0 pengembalian/);
  const axis = html.match(/data-chart-y-axis="true"[^>]*>([\s\S]*?)<\/g>/)[1];
  const ticks = [...axis.matchAll(/<text[^>]*>(\d+)<\/text>/g)].map(x => Number(x[1]));
  assert.deepEqual(ticks, [0, 1, 2]);
  assert.ok([...html.matchAll(/data-chart-tick=/g)].length < rows.length);
});
