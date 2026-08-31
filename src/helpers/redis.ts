import crypto, { type UUID } from "node:crypto";
import {
  diaSessionExpiration,
  productSyncStatusExpiration,
  sessionExpiration,
} from "../constants/redis/expirations.js";
import {
  diaSessionKey,
  productSyncStatusKey,
  sessionKey,
  userSessionKey,
} from "../constants/redis/keys.js";
import { redis } from "../redis/index.js";
import type { Session } from "../types/session.js";
import type { loadProducts } from "../services/product.js";

export type ProductSyncStatus =
  | { status: "running" }
  | {
      status: "done";
      newRowCounts: Awaited<ReturnType<typeof loadProducts>>;
    }
  | { status: "error"; message: string };

export async function setDiaSession(firmId: number, sessionId: string) {
  return await redis.set(`${diaSessionKey}:${firmId}`, sessionId, {
    expiration: { type: "EX", value: diaSessionExpiration },
  });
}

export async function getDiaSession(firmId: number) {
  return await redis.get(`${diaSessionKey}:${firmId}`);
}

/**
 * Also sets the user session
 * @returns the
 */
export async function setSession(
  userId: number,
  firmCode: string,
  role: "admin" | "superadmin",
  name: string,
): Promise<UUID> {
  const sessionId = crypto.randomUUID();
  const sessionHashKey = `${sessionKey}:${sessionId}`;
  const userSessionRedisKey = `${userSessionKey}:${userId}`;

  // check existing session
  const oldSessionId = await redis.get(userSessionRedisKey);

  const multi = redis.multi();

  if (oldSessionId) {
    multi.del(`${sessionKey}:${oldSessionId}`);
  }

  multi
    .hSet(sessionHashKey, { name, firmCode, role, userId })
    .expire(sessionHashKey, sessionExpiration)
    .set(userSessionRedisKey, sessionId, {
      expiration: { type: "EX", value: sessionExpiration },
    });

  await multi.exec();

  return sessionId;
}

/**
 * If you need the user session use {@link getUserSession}
 * @returns The session object
 */
export async function getSession(sessionId: string): Promise<Session | null> {
  const redisKey = `${sessionKey}:${sessionId}`;
  const session = await redis.hGetAll(redisKey);

  if (Object.keys(session).length === 0) return null;

  return {
    ...session,
    userId: Number(session.userId),
  } as Session;
}

/**
 * If you need the session object use {@link getSession}
 * @returns The sessionId tied to the {@link userId}
 */
export async function getUserSession(userId: string | number) {
  const redisKey = `${userSessionKey}:${userId}`;

  return await redis.get(redisKey);
}

export async function setProductSyncStatus(
  firmId: number,
  status: ProductSyncStatus,
) {
  return await redis.set(
    `${productSyncStatusKey}:${firmId}`,
    JSON.stringify(status),
    { expiration: { type: "EX", value: productSyncStatusExpiration } },
  );
}

/**
 * Deletes the status once it's read if it's a terminal state ("done"/"error"), so a stale
 * result doesn't reappear the next time it's polled (e.g. after a page reload).
 */
export async function consumeProductSyncStatus(
  firmId: number,
): Promise<ProductSyncStatus | null> {
  const redisKey = `${productSyncStatusKey}:${firmId}`;
  const raw = await redis.get(redisKey);

  if (!raw) return null;

  const status = JSON.parse(raw) as ProductSyncStatus;

  if (status.status !== "running") {
    await redis.del(redisKey);
  }

  return status;
}

/**
 * Also deletes user sessions
 */
export async function deleteSession(sessionId: string) {
  const sessionHashKey = `${sessionKey}:${sessionId}`;

  const userId = await redis.hGet(sessionHashKey, "userId");

  if (!userId) return null;

  const userSessionRedisKey = `${userSessionKey}:${userId}`;

  return await redis
    .multi()
    .del(sessionHashKey)
    .del(userSessionRedisKey)
    .exec();
}
