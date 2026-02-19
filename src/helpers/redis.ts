import crypto, { type UUID } from "node:crypto";
import {
  diaSessionExpiration,
  sessionExpiration,
} from "../constants/redis/expirations.js";
import {
  diaSessionKey,
  sessionKey,
  userSessionKey,
} from "../constants/redis/keys.js";
import { redis } from "../redis/index.js";
import type { Session } from "../types/session.js";

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
  serverCode: string,
  role: "admin" | "superadmin",
  name: string,
): Promise<UUID | null> {
  const sessionId = crypto.randomUUID();
  const sessionHashKey = `${sessionKey}:${sessionId}`;
  const userSessionRedisKey = `${userSessionKey}:${userId}`;

  const result = await redis
    .multi()
    .hSet(sessionHashKey, { name, serverCode, role, userId })
    .expire(sessionHashKey, sessionExpiration)
    .set(userSessionRedisKey, sessionId, {
      expiration: { type: "EX", value: sessionExpiration },
      condition: "NX", // only set non-conflicting
    })
    .exec();

  const setResult = result[2];
  // the type of the setResult is wrong,
  // when tested in runtime it can be seen that the condition below does work properly when a conflicting record is trying to be inserted.
  if (setResult === null) {
    await redis.del(sessionHashKey);
    return null;
  }

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
