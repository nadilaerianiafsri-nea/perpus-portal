const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");

function load(filename) {
  const absolute = path.join(__dirname, filename);
  const loaded = new Module(absolute);
  loaded.require = (name) => {
    if (name.endsWith(".css")) return { __esModule: true, default: {} };
    if (name.startsWith("./")) {
      const target = [name + ".ts", name + ".tsx"].find((value) =>
        fs.existsSync(path.join(__dirname, value)),
      );
      if (target) return load(target);
    }
    return require(name);
  };
  loaded._compile(
    ts.transpileModule(fs.readFileSync(absolute, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        target: ts.ScriptTarget.ES2022,
      },
    }).outputText,
    absolute,
  );
  return loaded.exports;
}

test("member filter displays case variants as one category and retains legacy URL selections", () => {
  const Filters = load("Filters.tsx").default;
  const html = renderToStaticMarkup(
    React.createElement(Filters, {
      member: true,
      ebook: false,
      query: new URLSearchParams("subject=novel"),
      options: {
        subjects: ["novel", "Novel", "NOVEL", "Hukum & HAM"],
        languages: ["Indonesia"],
        years: [2024],
      },
      update() {},
      clear() {},
    }),
  );
  assert.equal((html.match(/>Novel</g) ?? []).length, 1);
  assert.equal((html.match(/>novel</g) ?? []).length, 0);
  assert.equal((html.match(/>NOVEL</g) ?? []).length, 0);
  assert.ok(
    html.includes('checked=""'),
    "a legacy lowercase subject must remain selected",
  );
});

test("deduped choices retain every original API value and produce one removable chip", () => {
  const { filterChoices, memberFilterChips } = load("filterOptions.ts");
  const subjects = ["novel", "Novel", "NOVEL", "Hukum & HAM"];
  const novel = filterChoices(subjects).find((item) => item.label === "Novel");
  assert.deepEqual(novel.values, ["novel", "Novel", "NOVEL"]);
  const chips = memberFilterChips(
    new URLSearchParams(
      "subject=novel,Novel,NOVEL&search=Hukum&sort=yearDesc&page=2",
    ),
    { subjects, languages: [], years: [] },
    false,
  );
  assert.equal(chips.length, 1);
  assert.equal(chips[0].label, "Novel");
  assert.deepEqual(chips[0].values, novel.values);
});

test("applying draft filters only supplies filter keys and rejects reversed year ranges", () => {
  const { filterUpdates, filterValidationError } = load("filterOptions.ts");
  const query = new URLSearchParams(
    "type=FISIK&search=Hukum&sort=yearDesc&page=2&yearFrom=2026&yearTo=2020",
  );
  assert.match(filterValidationError(query), /Tahun awal/);
  query.set("yearTo", "2026");
  assert.equal(filterValidationError(query), null);
  assert.deepEqual(filterUpdates(query), {
    type: "FISIK",
    availability: null,
    subject: null,
    language: null,
    yearFrom: "2026",
    yearTo: "2026",
  });
  assert.equal(query.get("search"), "Hukum");
  query.set(
    "subject",
    Array.from({ length: 21 }, (_, index) => `Kategori ${index}`).join(","),
  );
  assert.match(filterValidationError(query), /maksimal 20/);
});
