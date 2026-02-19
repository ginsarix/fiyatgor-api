import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.url(),
  NODE_ENV: z.enum(["production", "development"]),
  DIA_PWD_SECRET_KEY: z
    .hex()
    .length(64)
    .transform((val) => Buffer.from(val, "hex")),
});

export const env = schema.parse(process.env);
