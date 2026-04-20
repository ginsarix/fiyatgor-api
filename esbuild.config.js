import { writeFileSync } from "node:fs";
import esbuild from "esbuild";
import pkg from "./package.json" with { type: "json" };

await esbuild.build({
  entryPoints: {
    bundle: "src/index.ts",
    seeder: "src/db/seeder.ts",
  },
  bundle: true,
  format: "cjs",
  platform: "node",
  outdir: "dist",
  external: ["bcrypt", "pg-native", "node-cron"],
});

writeFileSync(
  "dist/package.json",
  JSON.stringify(
    {
      name: "fiyatgor-api",
      dependencies: {
        bcrypt: pkg.dependencies.bcrypt,
        "node-cron": pkg.dependencies["node-cron"],
      },
    },
    null,
    2,
  ),
);
