import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
let resourceLoan;
function load(file) {
  const filename = path.resolve(file), loaded = new Module(filename);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = name => {
    if (name.endsWith(".css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) };
    if (name === "react") return { ...React, useEffect: () => {} };
    if (name === "next/image") return { __esModule: true, default: ({ fill, unoptimized, ...props }) => { void fill; void unoptimized; return React.createElement("img", props); } };
    if (name === "./api") return { useMemberResource: () => ({ data: { loan: resourceLoan }, loading: false }), memberRequest: () => {} };
    if (name === "./MemberContext") return { useMember: () => ({ refresh: () => {} }) };
    if (name === "./LoanDialog") return { __esModule: true, default: () => null };
    if (name.startsWith("@/") || name.startsWith(".")) {
      const base = name.startsWith("@/") ? path.resolve(name.slice(2)) : path.resolve(path.dirname(filename), name);
      if (base.endsWith(".cjs")) return require(base);
      return load([base + ".tsx", base + ".ts"].find(candidate => fs.existsSync(candidate)) ?? base);
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return loaded.exports;
}
const loan = { id: 7, status: "AKTIF", borrowedAt: "2026-10-22T03:00:00Z", dueAt: "2099-10-29T03:00:00Z", returnedAt: null, extensionCount: 1,
  lostReport: null, book: { id: 2, title: "Buku Riau", author: "Penulis Riau", code: "BK-002", coverUrl: "/images/landing/book-placeholder-1.svg", type: "FISIK" }, copy: { id: 3, code: "COPY-3" } };
const report = status => ({ status, source: "ANGGOTA", reportedAt: "2026-10-22T04:00:00Z", verifiedAt: null, resolvedAt: null });
const renderCard = row => renderToStaticMarkup(React.createElement(load("members/LoanCard.tsx").default,
  { loan: row, now: Date.parse("2026-10-22T04:00:00Z"), busy: false, extending: false, onExtend: () => {}, onReport: () => {}, onReplacement: () => {} }));

test("normal loan presents three explicit text actions in order and semantic date metadata", () => {
  const html = renderCard(loan);
  assert.match(html, />Perpanjang</);
  assert.match(html, />Detail</);
  assert.match(html, />Laporkan Buku Hilang</);
  assert.ok(html.indexOf("Perpanjang</") < html.indexOf(">Detail</"));
  assert.ok(html.indexOf(">Detail</") < html.indexOf("Laporkan Buku Hilang</"));
  assert.match(html, /href="\/dashboard\/pinjaman\/7"/);
  assert.match(html, /data-button-hover="accent"/);
  assert.match(html, /<time dateTime="/);
  assert.doesNotMatch(html, /data-button-shape="square"|<input|BK-002/);
});

test("reported loans expose the existing report destination without repeat report or extension", () => {
  for (const status of ["MENUNGGU_VERIFIKASI", "PROSES_PENGGANTIAN", "SELESAI"]) {
    const html = renderCard({ ...loan, status: status === "MENUNGGU_VERIFIKASI" ? "AKTIF" : "HILANG", lostReport: report(status) });
    assert.match(html, />Detail Laporan</);
    assert.doesNotMatch(html, />Perpanjang<|>Laporkan Buku Hilang</);
  }
});

test("detail combines status and dates, includes author/code, and has no empty status/report panel", () => {
  resourceLoan = loan;
  const html = renderToStaticMarkup(React.createElement(load("members/LoanDetail.tsx").default, { id: 7 }));
  assert.match(html, /aria-label="Breadcrumb"/);
  assert.match(html, /Informasi Pinjaman/);
  assert.match(html, /Penulis Riau/);
  assert.match(html, /BK-002/);
  assert.match(html, /Jumlah perpanjangan/);
  assert.match(html, /data-button="back"/);
  assert.doesNotMatch(html, /Laporan Buku Hilang|Status Pinjaman<\/h2>|Lihat Profil|Detail Laporan/);
});

test("reported detail shows report dates/status and no operational actions", () => {
  resourceLoan = { ...loan, lostReport: report("MENUNGGU_VERIFIKASI") };
  const html = renderToStaticMarkup(React.createElement(load("members/LoanDetail.tsx").default, { id: 7 }));
  assert.match(html, /Laporan Buku Hilang/);
  assert.match(html, /Menunggu Verifikasi/);
  assert.match(html, /Tanggal laporan/);
  assert.doesNotMatch(html, />Perpanjang<|>Laporkan Buku Hilang<|Diverifikasi/);
});
