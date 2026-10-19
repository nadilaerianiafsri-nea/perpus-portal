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
    if (name.startsWith('./')) return load(path.resolve(path.dirname(absolute), name + '.tsx'));
    return testRequire(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, absolute);
  return loaded.exports;
}
const base = { open: true, title: 'Konfirmasi Reservasi', description: 'Ambil buku dalam 24 jam.', onCancel: () => {}, onConfirm: async () => {} };
function render(props = {}) {
  const Dialog = load('components/ConfirmDialog.tsx').default;
  return renderToStaticMarkup(React.createElement(Dialog, { ...base, ...props }));
}

test('confirmation exposes a named modal with neutral cancel and primary action', () => {
  const html = render({ confirmLabel: 'Konfirmasi Reservasi' });
  assert.match(html, /<dialog[^>]*aria-modal="true"/);
  const labelledBy = html.match(/aria-labelledby="([^"]+)"/)[1];
  const describedBy = html.match(/aria-describedby="([^"]+)"/)[1];
  assert.ok(html.includes(`id="${labelledBy}"`));
  assert.ok(html.includes(`id="${describedBy}"`));
  assert.match(html, /data-button="secondary"/);
  assert.match(html, /data-button="primary"/);
  assert.match(html, /Ambil buku dalam 24 jam/);
});

test('pending destructive action disables both buttons and announces progress/errors', () => {
  const html = render({ variant: 'danger', pending: true, confirmLabel: 'Nonaktifkan', loadingLabel: 'Memproses...', error: 'Coba lagi.' });
  assert.match(html, /aria-busy="true"/);
  assert.equal((html.match(/disabled=""/g) || []).length, 2);
  assert.match(html, /data-button="danger"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /Memproses/);
});

test('information dialog has one dismissal action and preserves optional details', () => {
  const html = render({ variant: 'info', title: 'Informasi Penggantian Buku', onConfirm: undefined, cancelLabel: 'Tutup', children: React.createElement('p', null, 'Tidak ada denda uang.') });
  assert.equal((html.match(/<button\b/g) || []).length, 1);
  assert.match(html, /Tutup/);
  assert.match(html, /Tidak ada denda uang/);
});
