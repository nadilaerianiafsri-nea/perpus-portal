import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const filename = path.resolve("admin/ebooksProxy.ts");
const loaded = new Module(filename);
loaded.require = name => {
  if (name === "server-only") return {};
  if (name === "@/catalog/serverApi") return { API_URL: "http://backend.test" };
  if (name === "@/shared/requestSecurity.cjs") return require("../shared/requestSecurity.cjs");
  return require(name);
};
loaded._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, filename);
const { adminEBooksProxy } = loaded.exports;

test("circulation GET reaches the existing protected endpoint with cookie and query intact", async () => {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return Response.json({ activeLoans: { data: [] } });
  };
  try {
    const result = await adminEBooksProxy(new Request("http://portal.test/api/admin/ebooks/circulation?page=2&search=Buku", {
      headers: { Cookie: "other=hidden; perpus_session=test-session" },
    }), "circulation");
    assert.equal(result.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, "http://backend.test/admin/ebooks/circulation?page=2&search=Buku");
    assert.equal(calls[0].options.headers.Cookie, "perpus_session=test-session");
    assert.equal(calls[0].options.cache, "no-store");
    assert.deepEqual(await result.json(), { activeLoans: { data: [] } });
  } finally { globalThis.fetch = previous; }
});

test("circulation does not expose mutations or arbitrary subpaths", async () => {
  for (const [method, pathname] of [["POST", "circulation"], ["PATCH", "circulation"], ["GET", "circulation/1"], ["GET", "unknown"]]) {
    const result = await adminEBooksProxy(new Request("http://portal.test/api/admin/ebooks/" + pathname, { method }), pathname);
    assert.equal(result.status, 404);
  }
});

test("circulation detail permits only read-only loan/queue namespaces", async () => {
  const previous = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url, options }); return Response.json({ record: { id: 7 } }); };
  try {
    for (const resource of ["loans", "queues"]) {
      const result = await adminEBooksProxy(new Request(`http://portal.test/api/admin/ebooks/circulation/${resource}/7`, { headers: { Cookie: "perpus_session=admin" } }), `circulation/${resource}/7`);
      assert.equal(result.status, 200);
      assert.equal(calls.at(-1).url, `http://backend.test/admin/ebooks/circulation/${resource}/7`);
      assert.equal(calls.at(-1).options.headers.Cookie, "perpus_session=admin");
    }
    for (const [method, path] of [["PATCH", "circulation/loans/7"], ["POST", "circulation/queues/7"], ["GET", "circulation/unknown/7"], ["GET", "circulation/loans/7/delete"]]) {
      assert.equal((await adminEBooksProxy(new Request("http://portal.test/api/admin/ebooks/" + path, { method }), path)).status, 404);
    }
    assert.equal(calls.length, 2);
  } finally { globalThis.fetch = previous; }
});
