import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

if (process.env.NODE_ENV !== "production") {
  dotenvConfig();
}

const schema = z.object({
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(["production", "development"]),
  DIA_PWD_SECRET_KEY: z
    .hex()
    .length(64)
    .transform((val) => Buffer.from(val, "hex")),
  REDIS_URL: z.url(),
});

export const env = schema.parse(process.env);
