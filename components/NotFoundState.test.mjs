import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function load(file) {
  const filename = path.resolve(file), loaded = new Module(filename);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded.require = name => {
    if (name.endsWith(".css")) return { default: new Proxy({}, { get: (_, key) => String(key) }), __esModule: true };
    if (name === "next/navigation") return { useRouter: () => ({}), notFound: () => { throw Error("NEXT_NOT_FOUND"); } };
    if (name === "next/image") return { __esModule: true, default: props => React.createElement("img", props) };
    if (name.startsWith("@/") || name.startsWith(".")) {
      const base = name.startsWith("@/") ? path.resolve(name.slice(2)) : path.resolve(path.dirname(filename), name);
      return load([base, base + ".tsx", base + ".ts"].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile()) ?? base);
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText, filename);
  return loaded.exports;
}

test("global 404 has one main and heading, existing illustration and two accessible actions", () => {
  const Page = load("app/not-found.tsx").default;
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.equal((html.match(/<main[ >]/g) ?? []).length, 1);
  assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
  assert.match(html, /Halaman Tidak Ditemukan/);
  assert.match(html, /asset buku kaca pembesar/);
  assert.match(html, /alt="Buku terbuka dengan kaca pembesar bermotif Riau"/);
  assert.match(html, /<a[^>]*data-button="primary"[^>]*href="\/"/);
  assert.match(html, /data-button-hover="accent"/);
  assert.match(html, /Kembali ke Beranda/);
  assert.match(html, /data-button="secondary"/);
  assert.doesNotMatch(html, /This page could not be found/);
});

test("contextual 404s reuse the state without nesting main landmarks inside existing shells", () => {
  for (const [context, href, label] of [["admin", "/admin", "Kembali ke Dashboard"], ["dashboard", "/dashboard", "Kembali ke Ringkasan"]]) {
    const Page = load(`app/${context}/not-found.tsx`).default;
    const html = renderToStaticMarkup(React.createElement(Page));
    assert.match(html, new RegExp(`href="${href}"`));
    assert.ok(html.includes(label));
    assert.doesNotMatch(html, /<main[ >]/);
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1);
    assert.throws(() => load(`app/${context}/[...notFound]/page.tsx`).default(), /NEXT_NOT_FOUND/);
  }
});

test("missing collection resources keep precise wording and relevant navigation", () => {
  for (const [file, href] of [["app/koleksi/[id]/not-found.tsx", "/koleksi"], ["app/dashboard/koleksi/[id]/not-found.tsx", "/dashboard/koleksi"]]) {
    const html = renderToStaticMarkup(React.createElement(load(file).default));
    assert.match(html, /Koleksi Tidak Ditemukan/);
    assert.ok(html.includes(`href="${href}"`));
    assert.doesNotMatch(html, /This page could not be found/);
  }
});

test("history navigation accepts only a distinct same-origin web page; direct URLs fall back", () => {
  const { safeNotFoundHistoryTarget: target } = load("components/notFoundNavigation.ts");
  const current = "https://perpus.test/admin/halaman-tidak-ada";
  assert.equal(target(current, "https://perpus.test/admin/transaksi/e-book?tab=QUEUE"), "/admin/transaksi/e-book?tab=QUEUE");
  for (const previous of [undefined, "", "https://evil.test/admin", "javascript:alert(1)", "https://perpus.test/api/auth/logout", current, current + "?other=1", "not a url"]) {
    assert.equal(target(current, previous), null);
  }
});
