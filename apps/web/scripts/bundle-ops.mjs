// Bundles the operational scripts into self-contained ESM files for the Docker runtime image
// (no tsx / dev dependencies needed at runtime). Output: apps/web/ops/*.mjs
import { build } from "esbuild";

await build({
  entryPoints: { migrate: "scripts/migrate.ts", "bootstrap-admin": "scripts/bootstrap-admin.ts", "seed-demo": "scripts/seed-demo.ts" },
  outdir: "ops",
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  tsconfig: "tsconfig.json",
  external: ["pg-native"],
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
  logLevel: "info",
});
