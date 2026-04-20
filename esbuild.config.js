import { writeFileSync } from "node:fs";
import { sentryEsbuildPlugin } from "@sentry/esbuild-plugin";
import esbuild from "esbuild";
import pkg from "./package.json" with { type: "json" };

await esbuild.build({
  sourcemap: true,
  plugins: [
    // Put the Sentry esbuild plugin after all other plugins
    sentryEsbuildPlugin({
      authToken: process.env.SENTRY_AUTH_TOKEN,
      org: "panu-teknoloji",
      project: "fiyatgor-api",
    }),
  ],
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
