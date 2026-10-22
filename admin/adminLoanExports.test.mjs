import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
function load(filename) {
  const absolute = path.resolve(filename), loaded = new Module(absolute);
  loaded.paths = Module._nodeModulePaths(path.dirname(absolute));
  loaded.require = name => name.startsWith(".") || name.startsWith("@/")
    ? load((name.startsWith("@/") ? path.resolve(name.slice(2)) : path.resolve(path.dirname(absolute), name)) + ".ts")
    : require(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText, absolute);
  return loaded.exports;
}
const api = fs.existsSync("admin/adminLoanExports.ts") ? load("admin/adminLoanExports.ts") : {};
const member = { id: 998123, name: 'Nama, "Anggota"\nBaru', memberType: "UMUM", email: "private@example.test", whatsapp: "081234567890" };
const book = { id: 889123, title: "Buku Hukum", code: "BK-1", coverUrl: "/image.svg" };
const loan = { id: 778123, borrowedAt: "2026-10-20T18:00:00Z", dueAt: "2099-10-20T00:00:00Z", status: "AKTIF", extensionCount: 2, member, book, copy: { id: 667123, code: "INTERNAL-COPY" } };

test("physical CSV contains visible display fields in displayed order without internal metadata", () => {
  const csv = api.physicalLoansCsv([loan, { ...loan, book: { ...book, title: "Kedua" } }]);
  assert.ok(csv.startsWith('\uFEFF"Nama Anggota"'));
  assert.ok(csv.includes('"Nama, ""Anggota""\nBaru"'));
  assert.ok(csv.includes('"21 Okt 2026"'));
  assert.ok(csv.includes('"Pinjaman Aktif","2"'));
  assert.ok(csv.indexOf("Buku Hukum") < csv.indexOf("Kedua"));
  for (const value of ["998123", "889123", "778123", "667123", "private@example.test", "INTERNAL-COPY", "coverUrl"]) assert.ok(!csv.includes(value));
});

test("E-Book CSV uses real access dates, unlimited access and no redundant type column", () => {
  const csv = api.ebookAccessCsv([{ id: 12, addedAt: "2026-10-20T18:00:00Z", endsAt: null, member, book }]);
  assert.ok(csv.includes('"Mulai Akses (WIB)"'));
  assert.ok(csv.includes('"21 Okt 2026"'));
  assert.ok(csv.includes('"Tanpa Batas"'));
  assert.ok(!csv.includes('"Tipe"'));
});

test("both loan exports neutralize formulas including leading whitespace and escape quotes", () => {
  for (const value of ["=SUM(A1)", " +CMD", "\t@SUM(A1)", "\n-formula"]) {
    const unsafe = { ...loan, member: { ...member, name: value } };
    for (const csv of [api.physicalLoansCsv([unsafe]), api.ebookAccessCsv([{ ...unsafe, addedAt: loan.borrowedAt, endsAt: null }])]) {
      assert.ok(csv.includes(`"'${value}"`));
    }
  }
});
