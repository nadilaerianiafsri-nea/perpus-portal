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
  loaded.require = name => {
    if (name.startsWith("@/")) return load(name.slice(2) + ".ts");
    if (name.startsWith(".")) {
      const resolved = path.resolve(path.dirname(absolute), name);
      return name.endsWith(".cjs") ? require(resolved) : load(resolved + ".ts");
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, absolute);
  return loaded.exports;
}
const api = fs.existsSync("admin/ebookCirculation.ts") ? load("admin/ebookCirculation.ts") : {};
const user = { id: 1, name: '=HYPERLINK("bad")', memberType: "MAHASISWA", email: "private@example.test" };
const book = { id: 1, title: 'Buku, "Riau"\nEdisi kedua', code: "EB-01", coverUrl: "", author: "Penulis" };
const loan = { id: 7, user, book, status: "AKTIF", borrowedAt: "2026-10-01T17:00:00Z", dueAt: "2026-10-09T00:00:00Z", endedAt: null };
const queue = { id: 7, user, book, status: "MENUNGGU", queuedAt: "2026-10-03T00:00:00Z", offeredAt: null, claimExpiresAt: null, position: 2 };
const history = { ...loan, status: "DIKEMBALIKAN", endedAt: "2026-10-04T00:00:00Z" };
const period = { preset: "custom", from: "2026-10-02", to: "2026-10-02" };

test("loan and queue IDs have distinct detail URLs even when numeric IDs collide", () => {
  assert.equal(api.circulationDetailHref("ACTIVE", 7), "/admin/transaksi/e-book/7?jenis=akses");
  assert.equal(api.circulationDetailHref("HISTORY", 7), api.circulationDetailHref("ACTIVE", 7));
  assert.equal(api.circulationDetailHref("QUEUE", 7), "/admin/transaksi/e-book/7?jenis=antrean");
});

test("status labels reflect actual access completion and automatic expiry; unknowns stay neutral", () => {
  assert.equal(api.circulationStatusLabel("DIKEMBALIKAN"), "Akses Selesai");
  assert.equal(api.circulationStatusLabel("KEDALUWARSA"), "Berakhir Otomatis");
  assert.equal(api.circulationStatusLabel("DIBATALKAN"), "Dibatalkan");
  assert.equal(api.circulationStatusLabel("DITAWARKAN"), "Prioritas 24 Jam");
  assert.equal(api.circulationStatusLabel("KEDALUWARSA", "queue"), "Antrean Berakhir");
  assert.equal(api.circulationStatusLabel("FUTURE"), "Status tidak dikenal");
});

test("period uses borrowedAt, queuedAt and endedAt respectively, in WIB", () => {
  assert.equal(api.filterCirculationRows("ACTIVE", [loan], period).length, 1);
  assert.equal(api.filterCirculationRows("QUEUE", [queue], period).length, 0);
  assert.equal(api.filterCirculationRows("HISTORY", [history], period).length, 0);
  assert.equal(api.filterCirculationRows("HISTORY", [{ ...history, endedAt: loan.borrowedAt }], period).length, 1);
});

test("CSV has tab-specific columns and only the supplied visible rows, safely encoded in UTF-8", () => {
  for (const [section, row, header] of [["ACTIVE", loan, "Batas Akses,Status"], ["QUEUE", queue, "Posisi Antrean,Masuk Antrean,Status"], ["HISTORY", history, "Selesai,Status Akhir"]]) {
    const csv = api.circulationCsv(section, [row]);
    assert.ok(csv.startsWith('\uFEFF"Nama Anggota","Jenis Anggota","Judul E-Book","Kode E-Book",'));
    assert.ok(csv.split("\r\n")[0].endsWith(header.split(",").map(value => `"${value}"`).join(",")));
    assert.ok(csv.includes(`"'=HYPERLINK(""bad"")"`));
    assert.ok(csv.includes('"Buku, ""Riau""\nEdisi kedua"'));
    assert.ok(csv.includes("Mahasiswa"));
    assert.ok(!csv.includes(user.email));
    assert.ok(!csv.includes("ID"));
    assert.ok(!csv.includes("Dikembalikan"));
  }
  assert.equal(api.circulationCsv("ACTIVE", []).split("\r\n").length, 1);
});

test("detail loader requests only the correct read-only namespace with no-store", async () => {
  const calls = [];
  for (const [kind, record, resource] of [["loan", loan, "loans"], ["queue", queue, "queues"]]) {
    const result = await api.loadCirculationDetail(kind, 7, new AbortController().signal, async (url, options) => {
      calls.push({ url, options }); return Response.json({ kind, record });
    });
    assert.equal(result.record.id, 7);
    assert.equal(calls.at(-1).url, `/api/admin/ebooks/circulation/${resource}/7`);
    assert.equal(calls.at(-1).options.cache, "no-store");
    assert.equal(calls.at(-1).options.method, undefined);
  }
});

test("detail rejects invalid IDs, mismatched entity/record, malformed dates and supports 404/error/abort", async () => {
  const signal = new AbortController().signal;
  await assert.rejects(api.loadCirculationDetail("loan", 0, signal, async () => { throw Error("must not fetch"); }), /tidak valid/);
  assert.equal(await api.loadCirculationDetail("loan", 7, signal, async () => new Response(null, { status: 404 })), null);
  await assert.rejects(api.loadCirculationDetail("loan", 7, signal, async () => Response.json({ message: "Akses ditolak" }, { status: 403 })), /Akses ditolak/);
  for (const payload of [{ kind: "queue", record: queue }, { kind: "loan", record: { ...loan, id: 8 } }, { kind: "loan", record: { ...loan, borrowedAt: "bad" } }]) {
    await assert.rejects(api.loadCirculationDetail("loan", 7, signal, async () => Response.json(payload)), /belum dapat dimuat/);
  }
  const aborted = AbortSignal.abort();
  await assert.rejects(api.loadCirculationDetail("queue", 7, aborted, async () => { throw Error("must not fetch"); }), { name: "AbortError" });
});
