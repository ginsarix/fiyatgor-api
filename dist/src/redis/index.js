import { createClient } from "redis";
// connects to localhost on port 6379
export const redis = await createClient()
    .on("error", (err) => console.log("Redis Client Error", err))
    .connect();
export async function connectRedis() {
    if (redis.isOpen) {
        console.log("Redis is already opening, skipping connection...");
        return;
    }
    try {
        await redis.connect();
        console.log("Successfully connected to Redis");
    }
    catch (err) {
        console.error("Redis connection error", err);
    }
}
redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});
process.on("SIGTERM", async () => {
    redis.destroy();
    process.exit(0);
});
