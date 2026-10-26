import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(filename) {
  const absolute = path.resolve(filename), loaded = new Module(absolute);
  loaded.paths = Module._nodeModulePaths(path.dirname(absolute));
  loaded.require = name => {
    if (name.endsWith(".module.css")) return {};
    if (name.startsWith(".") || name.startsWith("@/")) {
      const target = name.startsWith("@/") ? path.resolve(name.slice(2)) : path.resolve(path.dirname(absolute), name);
      if (target.endsWith(".cjs")) return require(target);
      return load(fs.existsSync(target + ".ts") ? target + ".ts" : target + ".tsx");
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, absolute);
  return loaded.exports;
}
const api = fs.existsSync("admin/adminLoanDetails.ts") ? load("admin/adminLoanDetails.ts") : {};
const member = { id: 7, name: "Anggota", email: "a@example.test", whatsapp: "08123", memberType: "UMUM" };
const book = { id: 9, code: "BK-9", title: "Hukum", coverUrl: "", shelf: "Rak A" };
const loan = { id: 2, status: "AKTIF", borrowedAt: "2026-10-01T01:00:00Z", dueAt: "2026-10-30T01:00:00Z", returnedAt: null, extensionCount: 1, member, book, copy: { id: 4, code: "COPY-4", location: "Ruang baca" } };
const access = { id: 31, addedAt: "2026-10-01T01:00:00Z", lastOpenedAt: null, endsAt: null, progress: 25, member, book: { ...book, author: "Penulis" } };
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

test("overdue detail back context is allowlisted and never accepts an arbitrary return destination", () => {
  assert.equal(api.loanDetailBackHref('terlambat'), '/admin/transaksi/terlambat');
  for (const value of [undefined, 'https://evil.test', '//evil.test', ['terlambat'], '/admin/transaksi/terlambat']) assert.equal(api.loanDetailBackHref(value), '/admin/transaksi/peminjaman');
});

test("detail IDs accept only positive database integers", () => {
  for (const id of ["1", "2147483647"]) assert.equal(api.parseLoanDetailId(id), Number(id));
  for (const id of ["0", "-1", "1.2", "1e2", " 2", "2/3", "2147483648", "9007199254740992", ""]) {
    assert.equal(api.parseLoanDetailId(id), null, id);
  }
});

test("physical detail requests its exact resource with no list fallback", async () => {
  const signal = new AbortController().signal;
  const calls = [];
  const row = await api.loadPhysicalLoan(2, signal, async (url, options) => {
    calls.push({ url, options }); return json({ loan });
  });
  assert.deepEqual(row, loan);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "/api/members/admin/transactions/loans/2");
  assert.equal(calls[0].options.signal, signal);
  assert.equal(calls[0].options.cache, "no-store");
  assert.ok(!calls[0].options.method || calls[0].options.method === "GET");
});

test("e-book detail uses the UserEBook access ID endpoint", async () => {
  let requested;
  const result = await api.loadEbookAccess(31, new AbortController().signal, async url => {
    requested = url; return json({ access });
  });
  assert.equal(requested, "/api/members/admin/transactions/ebook-access/31");
  assert.deepEqual(result, access);
});

test("missing details return no record and never query another endpoint", async () => {
  for (const [loader, id] of [[api.loadPhysicalLoan, 2], [api.loadEbookAccess, 31]]) {
    let calls = 0;
    assert.equal(await loader(id, new AbortController().signal, async () => { calls++; return json({}, 404); }), null);
    assert.equal(calls, 1);
  }
});

test("authorization and service errors remain visible instead of becoming missing records", async () => {
  for (const loader of [api.loadPhysicalLoan, api.loadEbookAccess]) {
    for (const status of [401, 403, 503]) {
      await assert.rejects(loader(2, new AbortController().signal,
        async () => json({ message: "Akses ditolak" }, status)), /Akses ditolak/);
    }
  }
});

test("mismatched or malformed successful payloads cannot show another record", async () => {
  await assert.rejects(api.loadPhysicalLoan(2, new AbortController().signal, async () => json({ loan: { ...loan, id: 3 } })));
  await assert.rejects(api.loadEbookAccess(31, new AbortController().signal, async () => json({ access: { id: 31 } })));
});

test("invalid numeric IDs are rejected before any network request", async () => {
  let requests = 0;
  for (const loader of [api.loadPhysicalLoan, api.loadEbookAccess]) {
    for (const id of [0, -1, 1.5, 2147483648, NaN]) {
      await assert.rejects(loader(id, new AbortController().signal, async () => { requests++; return json({ loan }); }));
    }
  }
  assert.equal(requests, 0);
});

test("aborting before or during a request prevents stale detail results", async () => {
  for (const [loader, id, payload] of [[api.loadPhysicalLoan, 2, { loan }], [api.loadEbookAccess, 31, { access }]]) {
    const alreadyAborted = new AbortController(); alreadyAborted.abort();
    let calls = 0;
    await assert.rejects(loader(id, alreadyAborted.signal, async () => { calls++; return json(payload); }), { name: "AbortError" });
    assert.equal(calls, 0);
    const controller = new AbortController();
    await assert.rejects(loader(id, controller.signal, async () => { controller.abort(); return json(payload); }), { name: "AbortError" });
  }
});

test("physical final status takes precedence over its old due date", () => {
  assert.deepEqual(api.loanDetailStatus({ ...loan, status: "DIKEMBALIKAN", dueAt: "2000-01-01" }), { label: "Dikembalikan", tone: "success" });
  assert.deepEqual(api.loanDetailStatus({ ...loan, status: "HILANG", dueAt: "2000-01-01" }), { label: "Hilang", tone: "danger" });
  assert.equal(api.loanDetailStatus({ ...loan, dueAt: "2000-01-01" }).label, "Terlambat");
  assert.equal(api.loanDetailStatus({ ...loan, dueAt: "2999-01-01" }).label, "Aktif");
});

test("e-book status follows the actual nullable access deadline", () => {
  assert.equal(api.ebookDetailStatus(null, 1000).label, "Aktif");
  assert.equal(api.ebookDetailStatus("1970-01-01T00:00:01Z", 1000).label, "Berakhir");
  assert.equal(api.ebookDetailStatus("1970-01-01T00:00:02Z", 1000).label, "Aktif");
});

const components = fs.existsSync("admin/AdminLoanDetail.tsx") ? load("admin/AdminLoanDetail.tsx") : {};
test("detail initially shows loading without stale member or book information", () => {
  const html = renderToStaticMarkup(React.createElement(components.default, { id: 2, kind: "physical" }));
  assert.match(html, /Memuat detail peminjaman/);
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /a@example\.test|COPY-4/);
});

test("physical detail presents three read-only cards with one status and member record", () => {
  const html = renderToStaticMarkup(React.createElement(components.LoanDetailCards, { detail: { kind: "physical", row: { ...loan, status: "DIKEMBALIKAN" } } }));
  assert.equal((html.match(/<section/g) || []).length, 3);
  assert.equal((html.match(/Dikembalikan/g) || []).length, 1);
  assert.equal((html.match(/a@example\.test/g) || []).length, 1);
  assert.match(html, /COPY-4/);
  assert.match(html, /Rak A/);
  assert.match(html, /Ruang baca/);
  assert.doesNotMatch(html, /<button|TRX-|ID transaksi|Konfirmasi|Perpanjang/);
});

test("e-book detail uses access dates and author without invented expiry or physical copy fields", () => {
  const html = renderToStaticMarkup(React.createElement(components.LoanDetailCards, { detail: { kind: "ebook", row: access } }));
  assert.equal((html.match(/<section/g) || []).length, 3);
  assert.match(html, /Tanpa batas waktu/);
  assert.match(html, /Belum pernah dibuka/);
  assert.match(html, /Penulis/);
  assert.doesNotMatch(html, /Kode eksemplar|Tipe|<button|TRX-/);
});
