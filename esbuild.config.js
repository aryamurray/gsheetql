import { build } from "esbuild";

await build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/Code.js",
  target: "es2020", // compatible with GAS V8
  format: "iife", // makes globals accessible to Apps Script
  platform: "browser", // avoids node builtins
  legalComments: "none",
});
