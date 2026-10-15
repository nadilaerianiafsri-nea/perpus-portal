const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");

const compiled = ts.transpileModule(
  fs.readFileSync(require.resolve("./serverApi.ts"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
const loaded = new Module(__filename);
loaded.require = (name) =>
  name === "server-only" || name === "next/headers" ? {} : require(name);
loaded._compile(compiled, __filename);
const { getRelatedBooks } = loaded.exports;
const current = {
  id: 2,
  type: "EBOOK",
  author: "Penulis Utama",
  subject: "Hukum",
  year: 2024,
};
const item = (id, changes = {}) => ({
  ...current,
  id,
  author: "Penulis lain",
  subject: "Umum",
  ...changes,
});

test("E-Book recommendations exclude physical books/self, deduplicate and rank subject, author, year", async () => {
  const previous = global.fetch;
  const urls = [];
  global.fetch = async (url) => {
    urls.push(new URL(url));
    return Response.json({
      data: [
        current,
        item(1, { type: "FISIK" }),
        item(3, { year: 2025 }),
        item(4, { subject: "Hukum" }),
        item(5, { author: current.author }),
        item(6, { year: 2023 }),
        item(7, { year: 2010 }),
        item(4, { subject: "Hukum" }),
      ],
    });
  };
  try {
    const result = await getRelatedBooks(current);
    assert.equal(result.unavailable, false);
    assert.deepEqual(
      result.books.map((book) => book.id),
      [4, 5, 3, 6, 7],
    );
    assert.ok(urls.every((url) => url.pathname === "/ebooks"));
    assert.ok(
      urls.some((url) => url.searchParams.get("subject") === current.subject),
    );
    assert.ok(
      urls.some((url) => url.searchParams.get("search") === current.author),
    );
  } finally {
    global.fetch = previous;
  }
});

test("physical book recommendations retain the existing public catalogue endpoint", async () => {
  const previous = global.fetch;
  global.fetch = async (url) => {
    assert.equal(new URL(url).pathname, "/collections");
    return Response.json({ data: [current, item(8)] });
  };
  try {
    assert.deepEqual(
      (await getRelatedBooks({ ...current, type: "FISIK" })).books.map(
        (book) => book.id,
      ),
      [8],
    );
  } finally {
    global.fetch = previous;
  }
});

test("a failed E-Book recommendation source does not discard other successful sources", async () => {
  const previous = global.fetch;
  global.fetch = async (url) =>
    new URL(url).searchParams.has("subject")
      ? new Response("", { status: 503 })
      : Response.json({ data: [item(4)] });
  try {
    assert.deepEqual(
      (await getRelatedBooks(current)).books.map((book) => book.id),
      [4],
    );
  } finally {
    global.fetch = previous;
  }
});
