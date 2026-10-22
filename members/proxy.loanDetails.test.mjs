import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import Module, { createRequire } from "node:module";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const filename = path.resolve("members/proxy.ts"), loaded = new Module(filename);
loaded.require = name => name === "@/catalog/serverApi" ? { API_URL: "http://backend.test" }
  : name === "@/shared/requestSecurity.cjs" ? require("../shared/requestSecurity.cjs") : require(name);
loaded._compile(ts.transpileModule(readFileSync(filename, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const { memberProxy } = loaded.exports;

test("loan and UserEBook detail GETs retain exact ID and admin session cookie", async () => {
  const previous = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), options }); return Response.json({ found: true }); };
  try {
    for (const resource of ["loans/84", "ebook-access/913"]) {
      const result = await memberProxy(new Request("http://portal.test/api/members/admin/transactions/" + resource, {
        headers: { Cookie: "other=not-forwarded; perpus_session=test-only" },
      }), "admin/transactions/" + resource);
      assert.equal(result.status, 200);
      assert.deepEqual(await result.json(), { found: true });
      const call = calls.at(-1);
      assert.equal(call.url, "http://backend.test/members/admin/transactions/" + resource);
      assert.equal(call.options.headers.Cookie, "perpus_session=test-only");
      assert.equal(call.options.method, "GET");
      assert.equal(call.options.cache, "no-store");
    }
  } finally { globalThis.fetch = previous; }
});

test("new detail allowlist does not expose mutations or arbitrary subpaths", async () => {
  for (const [method, resource] of [["POST", "loans/1"], ["PATCH", "ebook-access/1"], ["GET", "loans/1/delete"], ["GET", "ebook-access/1/return"], ["GET", "ebook-access"]]) {
    const result = await memberProxy(new Request("http://portal.test/api/members/admin/transactions/" + resource, { method }), "admin/transactions/" + resource);
    assert.equal(result.status, 404);
  }
});

test("lost-report and case details forward only the exact session and existing namespace, with CSRF protection", async () => {
  const previous = globalThis.fetch, calls = [];
  globalThis.fetch = async (url, options) => { calls.push({ url: String(url), options }); return Response.json({ success: true }); };
  try {
    for (const [method, route] of [["GET", "me/loans/7"], ["POST", "me/loans/7/lost-report"], ["GET", "admin/transactions/lost-books/7"], ["POST", "admin/loans/7/lost/complete"]]) {
      const response = await memberProxy(new Request("http://portal.test/api/members/" + route, { method, headers: { Cookie: "unrelated=private; perpus_session=member-only", Origin: "http://portal.test" }, ...(method === "POST" ? { body: "{}" } : {}) }), route);
      assert.equal(response.status, 200);
      assert.equal(calls.at(-1).url, "http://backend.test/members/" + route);
      assert.equal(calls.at(-1).options.method, method);
      assert.equal(calls.at(-1).options.headers.Cookie, "perpus_session=member-only");
    }
    const rejected = await memberProxy(new Request("http://portal.test/api/members/me/loans/7/lost-report", { method: "POST", headers: { Origin: "http://attacker.test" }, body: "{}" }), "me/loans/7/lost-report");
    assert.equal(rejected.status, 403); assert.equal(calls.length, 4);
    for (const [method, route] of [["POST", "me/loans/7/lost/complete"], ["PATCH", "me/loans/7"], ["GET", "me/loans/7/lost-report"]]) {
      assert.equal((await memberProxy(new Request("http://portal.test/api/members/" + route, { method }), route)).status, 404);
    }
    assert.equal(calls.length, 4);
  } finally { globalThis.fetch = previous; }
});
