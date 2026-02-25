import { zValidator } from "@hono/zod-validator";
import { hash as bcryptHash } from "bcrypt";
import { count, eq } from "drizzle-orm";
import type { Hono } from "hono";
import { z } from "zod";
import { db } from "../db/index.js";
import { firmsTable } from "../db/schemas/firms.js";
import { jobsTable } from "../db/schemas/jobs.js";
import { usersTable } from "../db/schemas/users.js";
import { adminAuth, firmAuth } from "../middlewares/auth.js";
import { runProductSyncJob } from "../services/jobs/job-fns.js";
import { createJob, deleteJob } from "../services/jobs/scheduler.js";
import type {
  GetProductsOptions,
  ProductSortBy,
  SortOrder,
} from "../services/product.js";
import {
  getProducts,
  getProductsCount,
  loadProducts,
} from "../services/product.js";
import { toCronExpression } from "../utils/cron.js";
import {
  firmFormValidation,
  jobValidation,
  userFormValidation,
} from "../validations/zod.js";

export function registerAdminRoutes(app: Hono) {
  app.post("/admin/products/sync", adminAuth, firmAuth, async (c) => {
    const firm = c.get("firm");

    const newRowCounts = await loadProducts(
      db,
      firm.diaServerCode,
      {
        scf_stokkart_detay_listele: { firma_kodu: firm.diaFirmCode },
      },
      firm.id,
    );

    await db
      .update(jobsTable)
      .set({ lastRanAt: new Date() })
      .where(eq(jobsTable.firmId, firm.id));

    return c.json({ message: "Ürünler eşleştirildi", newRowCounts }, 200);
  });

  app.post(
    "/admin/jobs",
    adminAuth,
    firmAuth,
    zValidator("json", jobValidation),
    async (c) => {
      const firm = c.get("firm");

      const job = c.req.valid("json");

      const [existingJob] = await db
        .select({ count: count() })
        .from(jobsTable)
        .where(eq(jobsTable.firmId, firm.id));

      if (!existingJob || existingJob.count === 0) {
        const [insertedJob] = await db
          .insert(jobsTable)
          .values({ ...job, firmId: firm.id })
          .returning();

        createJob(
          insertedJob.id,
          toCronExpression(job.frequency, job.unit),
          () =>
            runProductSyncJob(
              db,
              firm.diaServerCode,
              firm.diaFirmCode,
              insertedJob.id,
              firm.id,
            ).catch((err) => console.error("Job failed: ", err)),
        );

        return c.json(
          { message: "Arka plan görevi başarıyla oluşturuldu", insertedJob },
          201,
        );
      }

      const [updatedJob] = await db
        .update(jobsTable)
        .set(job)
        .where(eq(jobsTable.firmId, firm.id))
        .returning();

      deleteJob(updatedJob.id);
      createJob(updatedJob.id, toCronExpression(job.frequency, job.unit), () =>
        runProductSyncJob(
          db,
          firm.diaServerCode,
          firm.diaFirmCode,
          updatedJob.id,
          firm.id,
        ).catch((err) => console.error("Job failed: ", err)),
      );

      return c.json(
        { message: "Arka plan görevi başarıyla güncellendi", updatedJob },
        200,
      );
    },
  );

  app.get("/admin/jobs", adminAuth, firmAuth, async (c) => {
    const { id: firmId } = c.get("firm");

    const [job] = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.firmId, firmId));

    if (!job)
      return c.json({ message: "Firmanızda arka plan görevi bulunamadı" }, 404);

    return c.json(
      {
        message: "Arka plan görevi başarıyla getirildi",
        job,
      },
      200,
    );
  });

  app.delete("/admin/jobs", adminAuth, firmAuth, async (c) => {
    const { id: firmId } = c.get("firm");

    const [deletedJob] = await db
      .delete(jobsTable)
      .where(eq(jobsTable.firmId, firmId))
      .returning({ jobId: jobsTable.id });

    if (deletedJob) deleteJob(deletedJob.jobId);

    return c.json({ message: "Arka plan görevi başarıyla silindi" }, 200);
  });

  app.get(
    "/admin/products",
    adminAuth,
    firmAuth,
    zValidator(
      "query",
      z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
        search: z.string().min(1).optional(),
        sortBy: z
          .enum(["name", "price", "stockCode", "status", "stockQuantity"])
          .default("stockCode"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    ),
    async (c) => {
      const { diaServerCode: serverCode } = c.get("firm");
      const { page, limit, search, sortBy, sortOrder } = c.req.valid("query");

      const options: GetProductsOptions = {
        page,
        limit,
        search,
        sortBy: sortBy as ProductSortBy,
        sortOrder: sortOrder as SortOrder,
      };

      const products = await getProducts(db, serverCode, options);

      return c.json(
        {
          products,
          rowCount: await getProductsCount(db, serverCode, search),
          message: "Ürünler başarıyla getirildi",
        },
        200,
      );
    },
  );

  app.get("/admin/firm", adminAuth, firmAuth, async (c) => {
    return c.json(
      {
        message: "Firma başarıyla getirildi",
        firm: { ...c.get("firm"), diaPassword: undefined },
      },
      200,
    );
  });

  app.get("/admin/me", adminAuth, async (c) => {
    return c.json(
      {
        message: "Kullanıcınız başarıyla getirildi",
        user: { ...c.get("user"), password: undefined },
      },
      200,
    );
  });

  app.patch(
    "/admin/me",
    adminAuth,
    zValidator("json", userFormValidation.partial()),
    async (c) => {
      const { id: userId } = c.get("user");

      const input = c.req.valid("json");

      const hashedPwd = input.password
        ? await bcryptHash(input.password, 12)
        : undefined;

      const [updatedUser] = await db
        .update(usersTable)
        .set({ ...input, password: hashedPwd, role: undefined })
        .where(eq(usersTable.id, userId))
        .returning();

      return c.json(
        {
          message: "Kullanıcınız başarıyla güncellendi",
          user: { ...updatedUser, password: undefined },
        },
        200,
      );
    },
  );

  app.patch(
    "/admin/firm",
    adminAuth,
    firmAuth,
    zValidator("json", firmFormValidation.partial()),
    async (c) => {
      const { id: firmId } = c.get("firm");

      const formInput = c.req.valid("json");

      const [updatedFirm] = await db
        .update(firmsTable)
        .set({ ...formInput, diaApiKey: formInput.diaApiKey ?? "" })
        .where(eq(firmsTable.id, firmId))
        .returning();

      return c.json(
        {
          message: "Firmanız güncellendi",
          updatedFirm: { ...updatedFirm, diaPassword: undefined },
        },
        200,
      );
    },
  );
}
