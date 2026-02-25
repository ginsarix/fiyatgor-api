import { zValidator } from "@hono/zod-validator";
import { hash as bcryptHash } from "bcrypt";
import { eq } from "drizzle-orm";
import type { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { firmsTable } from "../db/schemas/firms.js";
import { jobsTable } from "../db/schemas/jobs.js";
import { usersTable } from "../db/schemas/users.js";
import { runProductSyncJob } from "../services/jobs/job-fns.js";
import { createJob } from "../services/jobs/scheduler.js";
import { aesEncrypt } from "../utils/aes-256-gcm.js";
import { toCronExpression } from "../utils/cron.js";
import {
  authFormValidation,
  firmFormValidation,
  jobValidation,
} from "../validations/zod.js";

export function registerSuperAdminRoutes(app: Hono) {
  app.post(
    "/superadmin/users",
    zValidator(
      "json",
      authFormValidation.extend({
        name: z.string().min(1),
        firmId: z.number().int().positive(),
        role: z.enum(["admin", "superadmin"]),
      }),
    ),
    async (c) => {
      const input = c.req.valid("json");

      const [existingUser] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, input.email));

      if (existingUser)
        return c.json(
          { message: "Bu e-posta ile bir kullanıcı zaten kayıtlı" },
          409,
        );

      const hashedPassword = await bcryptHash(input.password, 12);

      const [createdUser] = await db
        .insert(usersTable)
        .values({
          firmId: input.firmId,
          name: input.name,
          email: input.email,
          password: hashedPassword,
          role: input.role,
        })
        .returning();

      c.header("Location", `/superadmin/users/${createdUser.id}`);

      return c.json(
        { message: "Kullanıcı başarıyla oluşturuldu", createdUser },
        201,
      );
    },
  );

  app.get("/superadmin/users", async (c) => {
    const users = await db.select().from(usersTable);

    return c.json(
      {
        message: "Kullanıcılar başarıyla getirildi",
        users: users.map((u) => ({
          ...u,
          password: undefined,
        })),
      },
      200,
    );
  });

  app.get("/superadmin/firms", async (c) => {
    const firms = await db.select().from(firmsTable);

    const strippedFirms = firms.map((f) => ({
      id: f.id,
      name: f.name,
      diaServerCode: f.diaServerCode,
      diaFirmCode: f.diaFirmCode,
      createdAt: f.createdAt,
      updatedAt: f.updatedAt,
    }));

    return c.json(
      { message: "Firmalar başarıyla getirildi", firms: strippedFirms },
      200,
    );
  });

  app.get("/superadmin/firms/:id", async (c) => {
    const id = c.req.param("id");

    const [firm] = await db
      .select()
      .from(firmsTable)
      .where(eq(firmsTable.id, Number(id)));

    if (!firm) return c.json({ message: "Firma bulunamadı" }, 404);

    return c.json({ message: "Firma başarıyla getirildi" }, 200);
  });

  app.patch(
    "/superadmin/firms/:id",
    zValidator("json", firmFormValidation.partial()),
    async (c) => {
      const id = c.req.param("id");
      const input = c.req.valid("json");

      const [firm] = await db
        .select()
        .from(firmsTable)
        .where(eq(firmsTable.id, Number(id)));

      if (!firm) return c.json({ message: "Firma bulunamadı" }, 404);

      const [updatedFirm] = await db
        .update(firmsTable)
        .set({ ...input, diaApiKey: input.diaApiKey ?? "" })
        .where(eq(firmsTable.id, Number(id)))
        .returning();

      return c.json(
        {
          message: "Firma başarıyla güncellendi",
          updatedFirm: { ...updatedFirm, diaPassword: undefined },
        },
        200,
      );
    },
  );

  app.delete("/superadmin/firms/:id", async (c) => {
    const id = c.req.param("id");

    const [firm] = await db
      .select()
      .from(firmsTable)
      .where(eq(firmsTable.id, Number(id)));

    if (!firm) return c.json({ message: "Firma bulunamadı" }, 404);

    await db.delete(firmsTable).where(eq(firmsTable.id, Number(id)));

    return c.json({ message: "Firma başarıyla silindi" }, 200);
  });

  app.post(
    "/superadmin/firms",
    zValidator(
      "json",
      z.object({ firm: firmFormValidation, job: jobValidation.nullish() }),
    ),
    async (c) => {
      const input = c.req.valid("json");

      const [createdFirm] = await db
        .insert(firmsTable)
        .values({
          ...input.firm,
          diaApiKey: input.firm.diaApiKey ?? "",
          diaPassword: aesEncrypt(input.firm.diaPassword),
        })
        .returning();

      if (input.job) {
        const [createdJob] = await db
          .insert(jobsTable)
          .values({ ...input.job, firmId: createdFirm.id })
          .returning({ id: jobsTable.id });

        createJob(
          createdJob.id,
          toCronExpression(input.job.frequency, input.job.unit),
          () =>
            runProductSyncJob(
              db,
              createdFirm.diaServerCode,
              createdFirm.diaFirmCode,
              createdJob.id,
              createdFirm.id,
            ),
        );
      }

      c.header("Location", `/superadmin/firm/${createdFirm.id}`);
      return c.json(
        { message: "Firma başarıyla oluşturuldu", createdFirm },
        201,
      );
    },
  );
}
