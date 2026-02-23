import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/test/bundle-smoke.test.ts"],
    globalSetup: ["src/test/bundle-setup.ts"],
    environment: "node",
    globals: true,
  },
});
