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
  loaded.require = name => name.startsWith(".") ? load(path.resolve(path.dirname(absolute), name) + ".ts") : require(name);
  loaded._compile(ts.transpileModule(fs.readFileSync(absolute, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, absolute);
  return loaded.exports;
}
const api = fs.existsSync("admin/reservationPickup.ts") ? load("admin/reservationPickup.ts") : {};

test("pickup uses the existing exact reservation POST and does not send a fabricated status or loan", async () => {
  const calls = [];
  await api.confirmReservationPickup(37, async (url, options) => { calls.push({ url, options }); return Response.json({ success: true }); });
  assert.deepEqual(calls, [{ url: "/api/members/admin/reservations/37/pickup", options: { method: "POST" } }]);
});

test("pickup propagates server errors for retry without reporting success", async () => {
  await assert.rejects(api.confirmReservationPickup(37, async () => Response.json({ message: "Reservasi sudah kedaluwarsa." }, { status: 409 })), /sudah kedaluwarsa/);
  await assert.rejects(api.confirmReservationPickup(37, async () => new Response("unavailable", { status: 503 })), /Pengambilan buku gagal dikonfirmasi/);
});

test("invalid reservation IDs cannot reach the pickup endpoint", async () => {
  let calls = 0;
  for (const id of [0, -1, 1.2, 2147483648, NaN]) {
    await assert.rejects(api.confirmReservationPickup(id, async () => { calls++; return Response.json({}); }), /tidak valid/);
  }
  assert.equal(calls, 0);
});
