import { zValidator } from "@hono/zod-validator";
import { count, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { jobsTable } from "../db/schemas/jobs.js";
import { adminAuth, firmAuth } from "../middlewares/auth.js";
import { runProductSyncJob } from "../services/jobs/job-fns.js";
import { createJob, deleteJob } from "../services/jobs/scheduler.js";
import { getProducts, getProductsCount, loadProducts, } from "../services/product.js";
import { toCronExpression } from "../utils/cron.js";
import { jobValidation } from "../validations/zod.js";
export function registerAdminRoutes(app) {
    app.post("/admin/products/sync", adminAuth, firmAuth, async (c) => {
        const firm = c.get("firm");
        const newRowCounts = await loadProducts(db, firm.diaServerCode, {
            scf_stokkart_detay_listele: { firma_kodu: firm.diaFirmCode },
        }, firm.id);
        return c.json({ message: "Ürünler eşleştirildi", newRowCounts }, 200);
    });
    app.post("/admin/jobs", adminAuth, firmAuth, zValidator("json", jobValidation), async (c) => {
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
            createJob(insertedJob.id, toCronExpression(job.frequency, job.unit), () => runProductSyncJob(db, firm.diaServerCode, firm.diaFirmCode, insertedJob.id, firm.id).catch((err) => console.error("Job failed: ", err)));
            return c.json({ message: "Arka plan görevi başarıyla oluşturuldu", insertedJob }, 201);
        }
        const [updatedJob] = await db
            .update(jobsTable)
            .set(job)
            .where(eq(jobsTable.firmId, firm.id))
            .returning();
        deleteJob(updatedJob.id);
        createJob(updatedJob.id, toCronExpression(job.frequency, job.unit), () => runProductSyncJob(db, firm.diaServerCode, firm.diaFirmCode, updatedJob.id, firm.id).catch((err) => console.error("Job failed: ", err)));
        return c.json({ message: "Arka plan görevi başarıyla güncellendi", updatedJob }, 200);
    });
    app.get("/admin/jobs", adminAuth, firmAuth, async (c) => {
        const { id: firmId } = c.get("firm");
        const [job] = await db
            .select()
            .from(jobsTable)
            .where(eq(jobsTable.firmId, firmId));
        if (!job)
            return c.json({ message: "Firmanızda arka plan görevi bulunamadı" }, 404);
        return c.json({
            message: "Arka plan görevi başarıyla getirildi",
            job,
        }, 200);
    });
    app.delete("/admin/jobs", adminAuth, firmAuth, async (c) => {
        const { id: firmId } = c.get("firm");
        const [deletedJob] = await db
            .delete(jobsTable)
            .where(eq(jobsTable.firmId, firmId))
            .returning({ jobId: jobsTable.id });
        if (deletedJob)
            deleteJob(deletedJob.jobId);
        return c.json({ message: "Arka plan görevi başarıyla silindi" }, 200);
    });
    app.get("/admin/products", adminAuth, firmAuth, zValidator("query", z.object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20),
    })), async (c) => {
        const { diaServerCode: serverCode } = c.get("firm");
        const pagination = c.req.valid("query");
        const products = await getProducts(db, serverCode, pagination.page, pagination.limit);
        return c.json({
            products,
            rowCount: await getProductsCount(db, serverCode),
            message: "Ürünler başarıyla getirildi",
        }, 200);
    });
}
