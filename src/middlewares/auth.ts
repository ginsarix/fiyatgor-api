import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { getCookie } from "hono/cookie";
import { createMiddleware } from "hono/factory";
import { db } from "../db/index.js";
import { firmsTable, type SelectableFirm } from "../db/schemas/firms.js";
import { type SelectableUser, usersTable } from "../db/schemas/users.js";
import { getSession } from "../helpers/redis.js";

async function getAuthenticatedUser(c: Context) {
  const cookie = getCookie(c, "session");
  if (!cookie) return null;

  const sessionUserId = await getSession(cookie);
  if (!sessionUserId) return null;

  const [foundUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, sessionUserId.userId));

  return foundUser;
}

type UserContext = {
  Variables: {
    user: SelectableUser;
  };
};

// stack on firmAuth
export const adminAuth = createMiddleware<UserContext>(async (c, next) => {
  const user = await getAuthenticatedUser(c);

  if (!user) return c.json({ message: "Oturum açmanız gerekiyor" }, 401);

  c.set("user", user);

  await next();
});

export const superAdminAuth = createMiddleware(async (c, next) => {
  const user = await getAuthenticatedUser(c);

  if (!user) return c.json({ message: "Oturum açmanız gerekiyor" }, 401);

  if (user.role !== "superadmin")
    return c.json({ message: "Bu işlem için yetkiniz bulunmuyor" }, 403);

  await next();
});

export const firmAuth = createMiddleware<
  UserContext & {
    Variables: { firm: SelectableFirm };
  }
>(async (c, next) => {
  const user = c.get("user");
  const requestedFirmServerCode = c.req.query("serverCode");

  if (!requestedFirmServerCode)
    return c.json({ message: "Sunucu kodu boş olamaz" }, 400);

  const [firm] = await db
    .select()
    .from(firmsTable)
    .where(eq(firmsTable.diaServerCode, requestedFirmServerCode));
  if (!firm)
    return c.json({ message: "Bu sunucu kodu ile bir firma bulunamadı" }, 404);

  if (firm.id !== user.firmId)
    return c.json({ message: "Bu firmaya erişim yetkiniz yok" }, 403);

  c.set("firm", firm);

  await next();
});
