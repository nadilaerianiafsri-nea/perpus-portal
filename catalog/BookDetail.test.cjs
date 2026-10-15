const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const code = ts.transpileModule(
  fs.readFileSync(require.resolve("./BookDetail.tsx"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  },
).outputText;

function page(type, user, member = false) {
  const loaded = new Module(__filename);
  loaded.require = (name) => {
    if (name === "./serverApi")
      return {
        getBook: async () => ({ book: { id: 116, type, availableCopies: 2 } }),
      };
    if (name === "@/auth/serverAuth")
      return { getCurrentUser: async () => user };
    if (name === "next/navigation")
      return {
        notFound() {
          throw Error("404");
        },
      };
    if (name.endsWith(".css")) return { __esModule: true, default: {} };
    if (name === "react" || name === "react/jsx-runtime") return require(name);
    return { __esModule: true, default: name, RelatedBooksLoading: "loading" };
  };
  loaded._compile(code, __filename);
  return loaded.exports.default({ id: "116", member });
}

for (const type of ["FISIK", "EBOOK"]) {
  test(`${type} public guest CTA returns to member detail after login`, async () => {
    const result = await page(type, null);
    const action = result.props.children.props.action;
    const links = Array.isArray(action.props.children)
      ? action.props.children
      : [action];
    const login = links.find((child) =>
      child?.props?.href?.startsWith("/login?"),
    );
    assert.ok(login);
    const query = new URL(login.props.href, "http://localhost").searchParams;
    assert.equal(
      query.get("returnUrl") ?? query.get("next"),
      "/dashboard/koleksi/116",
    );
    assert.equal(
      login.props.children,
      type === "EBOOK"
        ? "Masuk untuk Pinjam E-Book"
        : "Masuk untuk Ajukan Peminjaman",
    );
  });
  test(`${type} public member sees only a dashboard link, never a personal action component`, async () => {
    const result = await page(type, {
      role: "PENGUNJUNG",
      emailVerified: true,
    });
    const action = result.props.children.props.action;
    assert.equal(action.type, "next/link");
    assert.equal(action.props.href, "/dashboard/koleksi/116");
    assert.equal(action.props.children, "Buka di Dashboard");
  });
  test(`${type} member detail retains the existing transaction component`, async () => {
    const result = await page(
      type,
      { role: "PENGUNJUNG", emailVerified: true },
      true,
    );
    assert.equal(
      result.props.action.type,
      type === "EBOOK" ? "./EBookLibraryAction" : "./BorrowAction",
    );
  });
}
