import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  // These helpers are deliberately CommonJS
  // so Nest and Next share one validator.
  {
    files: ["shared/**/*.cjs", "catalog/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  globalIgnores([
    // Default ignores of eslint-config-next.
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",

    // Backend adalah project Nest terpisah
    // dan mempunyai lint command sendiri.
    "backend/**",

    // Asset vendor PDF.js yang disalin dari
    // node_modules untuk decoder WASM/JBIG2.
    "public/pdfjs/wasm/**",
  ]),
]);

export default eslintConfig;
