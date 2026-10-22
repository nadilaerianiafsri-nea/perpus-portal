import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
function load(filename) {
  const absolute = path.resolve(root, filename);
  const loaded = new Module(absolute);
  loaded.paths = Module._nodeModulePaths(path.dirname(absolute));
  loaded.require = name => {
    if (name.endsWith(".css")) return { __esModule: true, default: {} };
    if (name.startsWith("@/") || name.startsWith("./")) {
      const base = name.startsWith("@/") ? path.join(root, name.slice(2)) : path.resolve(path.dirname(absolute), name);
      return load([base, `${base}.ts`, `${base}.tsx`].find(candidate => fs.existsSync(candidate)));
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, absolute);
  return loaded.exports;
}

test("all time is unbounded and includes records with missing timestamps", () => {
  const { createTransactionPeriod, inTransactionPeriod } = load("shared/transactionPeriod.ts");
  const period = createTransactionPeriod("all", new Date("2026-12-31T17:00:00Z"));
  assert.deepEqual(period, { preset: "all", from: "", to: "" });
  for (const timestamp of [null, undefined, "", "invalid", "2026-01-01T00:00:00Z"]) {
    assert.equal(inTransactionPeriod(timestamp, period), true);
  }
});

test("today and month-to-date switch at midnight WIB across a year boundary", () => {
  const { createTransactionPeriod } = load("shared/transactionPeriod.ts");
  const before = new Date("2026-12-31T16:59:59Z"), after = new Date("2026-12-31T17:00:00Z");
  assert.deepEqual(createTransactionPeriod("today", before), { preset: "today", from: "2026-12-31", to: "2026-12-31" });
  assert.deepEqual(createTransactionPeriod("today", after), { preset: "today", from: "2027-01-01", to: "2027-01-01" });
  assert.deepEqual(createTransactionPeriod("this-month", before), { preset: "this-month", from: "2026-12-01", to: "2026-12-31" });
  assert.deepEqual(createTransactionPeriod("this-month", after), { preset: "this-month", from: "2027-01-01", to: "2027-01-01" });
});

test("last seven days includes today and six previous dates across leap day and year", () => {
  const { createTransactionPeriod } = load("shared/transactionPeriod.ts");
  assert.deepEqual(createTransactionPeriod("last-seven-days", new Date("2024-03-03T00:00:00Z")), { preset: "last-seven-days", from: "2024-02-26", to: "2024-03-03" });
  assert.deepEqual(createTransactionPeriod("last-seven-days", new Date("2027-01-01T00:00:00Z")), { preset: "last-seven-days", from: "2026-12-26", to: "2027-01-01" });
});

test("last month covers the full previous calendar month including leap years and January", () => {
  const { createTransactionPeriod } = load("shared/transactionPeriod.ts");
  const cases = [
    ["2024-03-15", "2024-02-01", "2024-02-29"],
    ["2025-03-15", "2025-02-01", "2025-02-28"],
    ["2027-01-15", "2026-12-01", "2026-12-31"],
    ["2026-05-15", "2026-04-01", "2026-04-30"],
  ];
  for (const [now, from, to] of cases) assert.deepEqual(createTransactionPeriod("last-month", new Date(`${now}T00:00:00Z`)), { preset: "last-month", from, to });
});

test("filter includes both WIB date boundaries and excludes adjacent instants", () => {
  const { inTransactionPeriod } = load("shared/transactionPeriod.ts");
  const period = { preset: "custom", from: "2026-10-20", to: "2026-10-21" };
  assert.equal(inTransactionPeriod("2026-10-19T16:59:59.999Z", period), false);
  assert.equal(inTransactionPeriod("2026-10-19T17:00:00Z", period), true);
  assert.equal(inTransactionPeriod("2026-10-21T16:59:59.999Z", period), true);
  assert.equal(inTransactionPeriod("2026-10-21T17:00:00Z", period), false);
  assert.equal(inTransactionPeriod("2026-10-20T00:00:00+07:00", period), true);
});

test("filtered periods exclude missing or invalid timestamps and invalid ranges", () => {
  const { inTransactionPeriod } = load("shared/transactionPeriod.ts");
  const period = { preset: "custom", from: "2026-10-20", to: "2026-10-21" };
  for (const timestamp of [null, undefined, "", "not a date"]) assert.equal(inTransactionPeriod(timestamp, period), false);
  for (const invalid of [{ from: "", to: "" }, { from: "2026-10-22", to: "2026-10-20" }, { from: "2026-02-30", to: "2026-10-21" }]) {
    assert.equal(inTransactionPeriod("2026-10-20T12:00:00Z", { preset: "custom", ...invalid }), false);
  }
});

test("transaction labels describe the active preset or custom dates", () => {
  const { createTransactionPeriod, transactionPeriodLabel } = load("shared/transactionPeriod.ts");
  assert.equal(transactionPeriodLabel(createTransactionPeriod("all")), "Semua Waktu");
  assert.equal(transactionPeriodLabel(createTransactionPeriod("last-seven-days")), "7 Hari Terakhir");
  assert.match(transactionPeriodLabel({ preset: "custom", from: "2026-12-31", to: "2027-01-01" }), /2026.*2027/);
});

test("transaction selector offers six presets with all-time selection", () => {
  const PeriodSelector = load("components/PeriodSelector.tsx").default;
  const html = renderToStaticMarkup(React.createElement(PeriodSelector, { mode: "transaction", value: { preset: "all", from: "", to: "" }, onChange() {} }));
  assert.match(html, /data-select-value[^>]*>Semua Waktu</);
  for (const label of ["Semua Waktu", "Hari Ini", "7 Hari Terakhir", "Bulan Ini", "Bulan Lalu", "Rentang Tanggal"]) assert.ok(html.includes(`>${label}</option>`));
  assert.equal((html.match(/<option /g) ?? []).length, 6);
});

test("default selector and dashboard period helpers retain their original contracts", () => {
  const PeriodSelector = load("components/PeriodSelector.tsx").default;
  const { createPeriod, validatePeriodRange } = load("shared/period.ts");
  const value = createPeriod("this-week", new Date("2026-10-18T17:00:00Z"));
  assert.deepEqual(value, { preset: "this-week", from: "2026-10-19", to: "2026-10-19" });
  assert.ok(validatePeriodRange("2025-01-01", "2026-10-19"));
  const html = renderToStaticMarkup(React.createElement(PeriodSelector, { value, onChange() {} }));
  assert.match(html, /data-select-value[^>]*>Minggu Ini</);
  assert.equal((html.match(/<option /g) ?? []).length, 4);
  assert.ok(html.includes(">Rentang Waktu</option>"));
});
