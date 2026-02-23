import { createClient } from "redis";
import { env } from "../config/env.js";

export const redis = createClient({ url: env.REDIS_URL });

redis.on("error", (err: Error) => {
  console.error("Redis connection error:", err);
});

process.on("SIGTERM", async () => {
  redis.destroy();
  process.exit(0);
});

export async function connectRedis() {
  try {
    await redis.connect();
    console.log("Successfully connected to Redis");
  } catch (err) {
    console.error("Redis connection error", err);
  }
}
