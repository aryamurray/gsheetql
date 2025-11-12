import { build } from "esbuild";
import { copyFileSync } from "fs";
import { mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });

build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  outfile: "dist/Code.js",
  target: "es2020",       // GAS V8 compatible
  format: "iife",         // Globals accessible to Apps Script
  platform: "browser",    // Avoid Node builtins
  legalComments: "none",
}).then(() => {
  // Copy manifest after build
  copyFileSync("appsscript.json", "dist/appsscript.json");
}).catch(() => process.exit(1));
