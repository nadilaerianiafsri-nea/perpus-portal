import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
const { outputText } = ts.transpileModule(
  readFileSync(new URL("./loginReturn.ts", import.meta.url), "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.ESNext },
  },
);
const { loginReturn } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

test("login returns directly to the same member collection detail, including legacy public next links", () => {
  assert.equal(loginReturn("/dashboard/koleksi/116"), "/dashboard/koleksi/116");
  assert.equal(loginReturn("/koleksi/112"), "/dashboard/koleksi/112");
  assert.equal(loginReturn("/dashboard/koleksi"), "/dashboard/koleksi");
  assert.equal(loginReturn("/e-book/116/baca"), "/e-book/116/baca");
});

test("return destination rejects external, encoded, malformed and unapproved routes", () => {
  for (const value of [
    undefined,
    null,
    [],
    {},
    ["/dashboard"],
    "https://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    "data:text/html,x",
    "/\\evil.example",
    "%2F%2Fevil.example",
    "/dashboard/koleksi/116?next=https://evil.example",
    "/dashboard/../admin",
    "/dashboard\n",
    "/admin",
    "/dashboard/koleksi/0",
    "/dashboard/koleksi/2147483648",
  ]) {
    assert.equal(loginReturn(value), "/dashboard", JSON.stringify(value));
  }
});
