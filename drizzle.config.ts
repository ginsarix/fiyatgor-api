import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schemas/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "postgresql://postgres.zpwyewtsgzttggnjhrdq:Banyemicem12*@aws-1-ap-south-1.pooler.supabase.com:5432/postgres",
  },
});
