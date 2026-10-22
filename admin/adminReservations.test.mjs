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
    if (name.startsWith(".") || name.startsWith("@/")) {
      const target = name.startsWith("@/") ? path.resolve(name.slice(2)) : path.resolve(path.dirname(absolute), name);
      return load(target + ".ts");
    }
    return require(name);
  };
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, absolute);
  return loaded.exports;
}
const api = fs.existsSync("admin/adminReservations.ts") ? load("admin/adminReservations.ts") : {};
const row = (id, createdAt = "2026-10-22T01:00:00Z") => ({
  id, createdAt, status: "MENUNGGU_PENGAMBILAN", expiresAt: "2026-10-23T01:00:00Z",
  pickedUpAt: null, cancelledAt: null,
  member: { id: 7, name: "Anggota", email: "anggota@example.test", whatsapp: "08123", memberType: "UMUM" },
  book: { id: 9, code: "BK-9", title: "Buku", coverUrl: "" }, copy: { id: 4, code: "COPY-4" },
});
const response = (data, page, totalPages) => new Response(JSON.stringify({
  data, meta: { page, totalPages, total: totalPages * 100, limit: 100 },
}), { headers: { "Content-Type": "application/json" } });

test("reservation ordering uses real dates and ID tie breaks without changing source rows", () => {
  const rows = [row(2), row(1, "2026-10-21T02:00:00Z"), row(3), row(4, "invalid")];
  assert.deepEqual(api.sortReservations(rows, "newest").map(r => r.id), [3, 2, 1, 4]);
  assert.deepEqual(api.sortReservations(rows, "oldest").map(r => r.id), [1, 2, 3, 4]);
  assert.deepEqual(rows.map(r => r.id), [2, 1, 3, 4]);
});

test("CSV keeps displayed order, quotes commas/newlines/quotes and neutralizes spreadsheet formulas", () => {
  const record = row(2);
  record.member.name = "  =HYPERLINK(\"unsafe\")";
  record.book.title = "Hukum, \"Riau\"\nJilid 1";
  const csv = api.reservationsCsv([record, row(1)]);
  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"\'  =HYPERLINK(""unsafe"")"'));
  assert.ok(csv.includes('"Hukum, ""Riau""\nJilid 1"'));
  assert.ok(csv.indexOf("TRX-00002") < csv.indexOf("TRX-00001"));
  assert.ok(csv.includes("Menunggu Pengambilan"));
  assert.ok(csv.includes("08.00") || csv.includes("08:00"));
});

test("detail lookup finds the exact ID beyond the first page using existing GET parameters", async () => {
  const requests = [];
  const fetcher = async (url, init) => {
    requests.push([url, init]);
    return response(requests.length === 1 ? [row(1)] : [row(2)], requests.length, 2);
  };
  const signal = new AbortController().signal;
  assert.equal((await api.loadReservation(2, null, signal, fetcher)).id, 2);
  assert.equal(requests.length, 2);
  for (const [url, init] of requests) {
    const parsed = new URL(url, "http://local.test");
    assert.equal(parsed.pathname, "/api/members/admin/transactions/reservations");
    assert.equal(parsed.searchParams.get("status"), "ALL");
    assert.equal(parsed.searchParams.get("limit"), "100");
    assert.equal(init.signal, signal);
    assert.ok(!init.method || init.method === "GET");
  }
});

test("member context narrows the live lookup through existing member detail instead of trusting URL data", async () => {
  const requests = [];
  const fetcher = async url => {
    requests.push(url);
    return url.endsWith("/members/7")
      ? new Response(JSON.stringify({ member: { email: "anggota@example.test" } }))
      : response([row(2)], 1, 1);
  };
  assert.equal((await api.loadReservation(2, 7, new AbortController().signal, fetcher)).id, 2);
  assert.equal(requests[0], "/api/members/admin/members/7");
  assert.equal(new URL(requests[1], "http://local.test").searchParams.get("search"), "anggota@example.test");
});

test("missing reservation returns no row and stops when the backend clamps a deleted page", async () => {
  let calls = 0;
  const fetcher = async () => response([row(1)], ++calls === 1 ? 1 : 1, 2);
  assert.equal(await api.loadReservation(5, null, new AbortController().signal, fetcher), null);
  assert.equal(calls, 2);
});

test("lookup exposes API failures rather than presenting stale details as current", async () => {
  await assert.rejects(api.loadReservation(1, null, new AbortController().signal,
    async () => new Response(JSON.stringify({ message: "Layanan tidak tersedia" }), { status: 503 })), /Layanan tidak tersedia/);
});

test("invalid detail IDs make no requests", async () => {
  let calls = 0;
  await assert.rejects(api.loadReservation(-1, null, new AbortController().signal, async () => { calls++; }), /tidak valid/);
  assert.equal(calls, 0);
});

test("navigation cancellation is preserved during a live lookup", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(api.loadReservation(1, null, controller.signal, async (url, init) => {
    init.signal.throwIfAborted();
  }), { name: "AbortError" });
});
