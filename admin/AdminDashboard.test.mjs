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
    if (name.startsWith('./') || name.startsWith('@/')) {
      const target = name.startsWith('@/') ? path.resolve(name.slice(2)) : path.resolve(path.dirname(absolute), name);
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

test('dashboard starts with blank native dates, not an implicitly applied period', () => {
  const html = render();
  const inputs = [...html.matchAll(/<input\b[^>]*type="date"[^>]*>/g)].map(match => match[0]);
  assert.equal(inputs.length, 2);
  for (const input of inputs) {
    assert.match(input, /value=""/);
    assert.match(input, /max="\d{4}-\d{2}-\d{2}"/);
    assert.match(input, /id="[^"]+"/);
  }
  assert.match(html, /Pilih tanggal mulai/);
  assert.match(html, /Pilih tanggal akhir/);
  assert.doesNotMatch(html, /<polyline/);
});

test('filter labels explain chart scope and expose separate Apply and Reset actions', () => {
  const html = render();
  assert.match(html, /Filter Periode/);
  assert.match(html, /Reset/);
  assert.match(html, /Terapkan/);
  assert.doesNotMatch(html, />Segarkan<|>Segarkan<\//);
  assert.match(html, /<button[^>]*disabled=""[^>]*>[\s\S]*?Terapkan/);
});
