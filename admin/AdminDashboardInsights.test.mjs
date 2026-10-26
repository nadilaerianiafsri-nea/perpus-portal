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
const { TopBorrowedCollections, AdminActionRequired, default: Insights } = load('admin/AdminDashboardInsights.tsx');
const { dashboardActionItems } = load('admin/dashboardInsights.ts');
const zero = { expiringReservations: 0, overdueLoans: 0, pendingLostBookReplacements: 0, failedNotifications: 0 };
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, { onRetry() {}, ...props }));

test('top collection rows preserve real IDs, full accessible titles, counts, and specific detail links', () => {
  const collections = [25, 19, 13, 9, 5].map((borrowCount, i) => ({ id: i + 7, title: `Koleksi ${i + 1} dengan judul sangat panjang`, borrowCount }));
  const html = render(TopBorrowedCollections, { collections });
  assert.equal([...html.matchAll(/<a /g)].length, 5);
  assert.match(html, /href="\/admin\/koleksi\/data-buku\/7"/);
  assert.match(html, /title="Koleksi 1 dengan judul sangat panjang"/);
  assert.match(html, /aria-label="Lihat detail koleksi Koleksi 1 dengan judul sangat panjang, 25 kali dipinjam"/);
  assert.match(html, /width:100%/);
  assert.match(html, /width:20%/);
  assert.ok(html.indexOf('25 kali dipinjam') < html.indexOf('19 kali dipinjam'));
});

test('no borrowing history shows the required empty state without empty bars', () => {
  const html = render(TopBorrowedCollections, { collections: [] });
  assert.match(html, /Belum ada data peminjaman\./);
  assert.match(html, /Koleksi yang sudah dipinjam akan tampil di sini\./);
  assert.doesNotMatch(html, /<a |width:/);
});

test('zero action categories are omitted and all-zero actions show one positive empty state', () => {
  assert.deepEqual(dashboardActionItems(zero), []);
  const html = render(AdminActionRequired, { actions: zero });
  assert.match(html, /Tidak ada tindakan yang perlu ditangani saat ini\./);
  assert.doesNotMatch(html, /<a /);
  const mixed = render(AdminActionRequired, { actions: { ...zero, overdueLoans: 3 } });
  assert.equal([...mixed.matchAll(/<a /g)].length, 1);
  assert.match(mixed, /3 peminjaman melewati jatuh tempo/);
  assert.doesNotMatch(mixed, /reservasi mendekati|pengiriman email gagal/);
});

test('each action uses a specific supported destination, with no invented failure query or WhatsApp state', () => {
  const actions = { expiringReservations: 2, overdueLoans: 3, pendingLostBookReplacements: 4, failedNotifications: 5 };
  const items = dashboardActionItems(actions);
  assert.deepEqual(items.map(item => item.href), [
    '/admin/transaksi/reservasi?status=MENUNGGU_PENGAMBILAN',
    '/admin/transaksi/terlambat',
    '/admin/transaksi/buku-hilang-penggantian?status=PROCESS',
    '/admin/notifikasi',
  ]);
  const html = render(AdminActionRequired, { actions });
  assert.equal([...html.matchAll(/<a /g)].length, 4);
  assert.doesNotMatch(html, /<button|WhatsApp|menunggu verifikasi/);
  assert.match(html, /pengiriman email gagal/);
});

test('each section renders independent loading/error feedback and a retry action', () => {
  const loading = render(TopBorrowedCollections, { loading: true });
  assert.match(loading, /aria-busy="true"/);
  assert.match(loading, /role="status"/);
  assert.doesNotMatch(loading, /Belum ada data peminjaman/);
  const failed = render(AdminActionRequired, { failed: true });
  assert.match(failed, /role="alert"/);
  assert.match(failed, /Data belum dapat dimuat\./);
  assert.match(failed, /Coba Lagi/);
  assert.doesNotMatch(failed, /Tidak ada tindakan/);
});

test('one unavailable supplementary field does not hide the other section or fake an empty success', () => {
  const html = render(Insights, {
    data: { topBorrowedCollections: null, actionRequired: { ...zero, overdueLoans: 2 } },
    loading: false, failed: false, period: { from: '2026-10-01', to: '2026-10-20', preset: 'this-month' },
  });
  assert.equal([...html.matchAll(/role="alert"/g)].length, 1);
  assert.match(html, /2 peminjaman melewati jatuh tempo/);
  assert.doesNotMatch(html, /Belum ada data peminjaman/);
});
