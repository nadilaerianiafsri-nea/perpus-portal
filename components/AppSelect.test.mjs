import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import Module from "node:module";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const filename = new URL("./AppSelect.tsx", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");
function render(props, children) {
  const loaded = new Module(filename);
  loaded.paths = Module._nodeModulePaths(filename.slice(0, filename.lastIndexOf("/")));
  loaded._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return renderToStaticMarkup(React.createElement(loaded.exports.default, props, children));
}
const options = [{ value: "all", label: "Semua" }, { value: "active", label: "Aktif" }];

test("controlled selection renders its label and accessible combobox", () => {
  const html = render({ options, value: "active", onChange() {}, "aria-label": "Status" });
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-label="Status"/);
  assert.match(html, /aria-haspopup="listbox"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /data-select-value[^>]*>Aktif</);
});
test("form bridge preserves name, required and edit initial value without another tab stop", () => {
  const html = render({ options, defaultValue: "active", name: "status", required: true });
  assert.match(html, /<select[^>]*name="status"/);
  assert.match(html, /required=""/);
  assert.match(html, /aria-hidden="true"/);
  assert.match(html, /tabindex="-1"/);
  assert.match(html, /<option value="active" selected="">/);
  assert.match(html, /aria-required="true"/);
});
test("option children and numeric values keep existing form semantics", () => {
  const html = render({ defaultValue: 20 }, [10, 20].map(value => React.createElement("option", { key: value, value }, `${value} / halaman`)));
  assert.match(html, /data-select-value[^>]*>20 \/ halaman</);
  assert.match(html, /<option value="20" selected="">/);
});
test("disabled and loading states block the visible trigger", () => {
  assert.match(render({ options, disabled: true }), /<button[^>]*disabled=""/);
  const html = render({ options, loading: true });
  assert.match(html, /<button[^>]*disabled=""/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Memuat\.\.\./);
});
test("error helper is linked to the invalid trigger", () => {
  const html = render({ options, label: "Status", error: "Pilih status." });
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /aria-describedby="[^"]+-error"/);
  assert.match(html, /role="alert">Pilih status\.</);
});
test("empty selection has a readable placeholder", () => {
  assert.match(render({ options: [], placeholder: "Pilih kategori" }), /data-select-value[^>]*>Pilih kategori</);
});
