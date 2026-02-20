import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["dotenv/config"],
    env: {
      NODE_ENV: "development",
    },
  },
});
