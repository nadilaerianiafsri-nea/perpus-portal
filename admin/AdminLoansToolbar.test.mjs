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
    if (name.endsWith(".css")) return { __esModule: true, default: {} };
    if (name === "next/navigation") return { useSearchParams: () => new URLSearchParams() };
    if (name.startsWith(".") || name.startsWith("@/")) {
      const target = name.startsWith("@/") ? path.resolve(name.slice(2)) : path.resolve(path.dirname(absolute), name);
      if (target.endsWith(".cjs")) return require(target);
      return load(fs.existsSync(target + ".ts") ? target + ".ts" : target + ".tsx");
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, absolute);
  return loaded.exports;
}

test("one global loan toolbar precedes the physical table with no controls in access section", () => {
  const Page = load("admin/AdminLoansPage.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.equal((html.match(/type="search"/g) ?? []).length, 1);
  assert.equal((html.match(/data-period-selector="true"/g) ?? []).length, 1);
  assert.equal((html.match(/<button[^>]*aria-label="Filter jenis anggota peminjaman"/g) ?? []).length, 1);
  assert.equal((html.match(/aria-haspopup="menu"/g) ?? []).length, 1);
  assert.ok(html.indexOf('aria-label="Cari peminjaman"') < html.indexOf("Buku Fisik yang Sedang Dipinjam"));
  assert.ok(html.indexOf('aria-label="Filter waktu peminjaman dan akses E-Book"') < html.indexOf('aria-haspopup="menu"'));
  const access = html.slice(html.indexOf("Akses E-Book yang Sedang Berjalan"));
  assert.doesNotMatch(access, /data-period-selector|Ekspor CSV|<select|Pencarian dan jenis anggota|Status dan jatuh tempo hanya/);
  assert.match(access, /MULAI AKSES.*BERAKHIR.*AKSI/);
});

test("export menu stays available when only E-Book has rows and has a named closed trigger", () => {
  const filename = "admin/AdminLoanExportMenu.tsx";
  const Menu = fs.existsSync(filename) ? load(filename).default : undefined;
  assert.equal(typeof Menu, "function");
  const html = renderToStaticMarkup(React.createElement(Menu, { physicalAvailable: false, ebookAvailable: true, onPhysical() {}, onEbook() {} }));
  assert.match(html, /aria-haspopup="menu"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-label="Ekspor data peminjaman CSV"/);
  assert.match(html, /data-button="primary"/);
  assert.match(html, /data-button-hover="accent"/);
  assert.doesNotMatch(html, /disabled=""|role="menuitem"/);
});

test("export is blocked during loading or when both filtered datasets are empty", () => {
  const filename = "admin/AdminLoanExportMenu.tsx";
  const Menu = fs.existsSync(filename) ? load(filename).default : undefined;
  assert.equal(typeof Menu, "function");
  for (const props of [{ disabled: true, physicalAvailable: true, ebookAvailable: true }, { physicalAvailable: false, ebookAvailable: false }]) {
    const html = renderToStaticMarkup(React.createElement(Menu, { ...props, onPhysical() {}, onEbook() {} }));
    assert.match(html, /disabled=""/);
  }
});
