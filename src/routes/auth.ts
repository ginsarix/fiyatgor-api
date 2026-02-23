import { zValidator } from "@hono/zod-validator";
import { compare as bcryptCompare } from "bcrypt";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sessionExpiration } from "../constants/redis/expirations.js";
import { db } from "../db/index.js";
import { firmsTable } from "../db/schemas/firms.js";
import { usersTable } from "../db/schemas/users.js";
import { deleteSession, getSession, setSession } from "../helpers/redis.js";
import { authFormValidation } from "../validations/zod.js";

export async function registerAuthRoutes(app: Hono) {
  app.post(
    "/auth/sessions",
    zValidator("json", authFormValidation),
    async (c) => {
      const input = c.req.valid("json");

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, input.email));

      if (!user) {
        // prevent timing attacks
        await bcryptCompare(
          "dumdum",
          "$2a$12$nz3oVrDh0JBmUbGgzDdGUec/FrN7LBU8wDXab.Jc.KJKltOk93.u.",
        ); // just a dummy hash

        return c.json({ message: "E-posta veya parola yanlış" }, 401);
      }

      const compareRes = await bcryptCompare(input.password, user.password);

      if (!compareRes)
        return c.json({ message: "E-posta veya parola yanlış" }, 401);

      const [firm] = await db
        .select({ serverCode: firmsTable.diaServerCode })
        .from(firmsTable)
        .where(eq(firmsTable.id, user.firmId));
      if (!firm) {
        return c.json({ message: "Firmanız bulunamadı" }, 404);
      }

      const sessionId = await setSession(
        user.id,
        firm.serverCode,
        user.role,
        user.name,
      );

      // if the return value of setSession is null the most likely situation is a conflict because of the NX option
      if (!sessionId)
        return c.json(
          {
            message:
              "Oturumunuz oluşturulamadı, zaten giriş yapılı olabilirsiniz",
          },
          403,
        );

      setCookie(c, "session", sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/",
        maxAge: sessionExpiration,
      });

      return c.json({ message: "Başarıyla giriş yapıldı" }, 200);
    },
  );

  app.get("/auth/sessions/current", async (c) => {
    const unauthorizedResponse = c.json({ message: "Oturum bulunamadı" }, 401);

    const sessionId = getCookie(c, "session");
    if (!sessionId) return unauthorizedResponse;

    const session = await getSession(sessionId);
    if (!session) return unauthorizedResponse;

    return c.json(
      {
        session,
        message: "Oturum başarıyla getirildi",
      },
      200,
    );
  });

  app.delete("/auth/sessions/current", async (c) => {
    const sessionId = getCookie(c, "session");
    if (sessionId) await deleteSession(sessionId);
    deleteCookie(c, "session");

    return c.json({ message: "Çıkış yapıldı" }, 200);
  });
}
