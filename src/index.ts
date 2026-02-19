import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { env } from "./config/env.js";
import { db } from "./db/index.js";
import { adminAuth, firmAuth, superAdminAuth } from "./middlewares/auth.js";
import { connectRedis } from "./redis/index.js";
import { registerRoutes } from "./routes/index.js";
import { loadJobsFromDB } from "./services/jobs/job-fns.js";

const app = new Hono();

app.use(logger());

app.use(
  "/*",
  cors({
    origin: (origin) => {
      // allow all origins that uses the https protocol
      if (
        origin.startsWith("https://") &&
        // and ends with ↓
        origin.endsWith(".fiyatgor.panunet.com.tr")
      ) {
        return origin;
      }
      if (origin === "https://fiyatgor.panunet.com.tr") {
        return origin;
      }

      if (
        env.NODE_ENV === "development" &&
        origin.startsWith("http://localhost:")
      ) {
        return origin;
      }

      return null;
    },
    credentials: true,
  }),
);

await connectRedis().catch(console.error);

app.get("/", (c) => {
  return c.text("Fiyatgör API");
});

await loadJobsFromDB(db);

registerRoutes(app);

app.use("/superadmin/*", superAdminAuth);

app.onError((err, c) => {
  console.error(`Error: ${err}`);
  return c.json({ error: err.message }, 500);
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://${info.address}:${info.port}`);
  },
);
