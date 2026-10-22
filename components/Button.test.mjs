import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

function loadButton() {
  const filename = path.join(path.dirname(fileURLToPath(import.meta.url)), "Button.tsx");
  const loaded = new Module(filename);
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    }).outputText,
    filename,
  );
  return loaded.exports;
}

test("a loading submit keeps its label space and blocks a second submission", () => {
  const { Button } = loadButton();
  const html = renderToStaticMarkup(
    React.createElement(
      Button,
      {
        type: "submit",
        variant: "primary",
        loading: true,
        loadingLabel: "Menyimpan...",
        fullWidth: true,
      },
      "Simpan Perubahan",
    ),
  );
  assert.match(html, /type="submit"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /data-button="primary"/);
  assert.match(html, /data-button-full-width="true"/);
  assert.match(html, /Simpan Perubahan/);
  assert.match(html, /Menyimpan/);
});

test("buttons default to non-submit while navigation remains a real link", () => {
  const { Button, ButtonLink } = loadButton();
  const button = renderToStaticMarkup(
    React.createElement(Button, { variant: "ghost", disabled: true }, "Batal"),
  );
  assert.match(button, /type="button"/);
  assert.match(button, /disabled=""/);
  const link = renderToStaticMarkup(
    React.createElement(
      ButtonLink,
      { href: "/dashboard/koleksi/12", variant: "secondary", size: "sm" },
      "Lihat Detail",
    ),
  );
  assert.match(link, /<a /);
  assert.match(link, /href="\/dashboard\/koleksi\/12"/);
  assert.match(link, /data-button="secondary"/);
  assert.doesNotMatch(link, /role="button"/);
});

test("accent hover opts into shared button appearance without leaking a React prop", () => {
  const { Button, ButtonLink } = loadButton();
  for (const html of [
    renderToStaticMarkup(React.createElement(Button, { accentHover: true }, "Ekspor CSV")),
    renderToStaticMarkup(React.createElement(ButtonLink, { href: "/admin/transaksi/peminjaman/1", variant: "primary", accentHover: true }, "Detail")),
  ]) {
    assert.match(html, /data-button-hover="accent"/);
    assert.doesNotMatch(html, /accentHover=/);
  }
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(Button, {}, "Simpan")), /data-button-hover=/);
});

test("row action appearance opts in without changing navigation or mutation semantics", () => {
  const { Button, ButtonLink } = loadButton();
  const row = renderToStaticMarkup(React.createElement(ButtonLink, {
    href: "/admin/koleksi/data-buku/7/edit", variant: "warning", rowAction: "warning",
    "aria-label": "Edit buku", title: "Edit buku", "data-button-shape": "square",
  }, React.createElement("svg")));
  assert.match(row, /href="\/admin\/koleksi\/data-buku\/7\/edit"/);
  assert.match(row, /data-row-action="warning"/);
  assert.match(row, /aria-label="Edit buku"/);
  assert.match(row, /title="Edit buku"/);
  assert.doesNotMatch(row, /rowAction=|role="button"/);
  const page = renderToStaticMarkup(React.createElement(Button, { variant: "warning" }, "Konfirmasi"));
  assert.doesNotMatch(page, /data-row-action/);
});

test("busy row actions preserve native disabled semantics and both stable labels", () => {
  const { Button } = loadButton();
  const html = renderToStaticMarkup(React.createElement(Button, {
    variant: "danger", rowAction: "danger-soft", loading: true, loadingLabel: "Memproses...",
  }, "Nonaktifkan"));
  assert.match(html, /data-row-action="danger-soft"/);
  assert.match(html, /data-button-loading="true"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Nonaktifkan/);
  assert.match(html, /Memproses/);
});
