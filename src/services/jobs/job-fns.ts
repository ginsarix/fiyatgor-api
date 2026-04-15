import { eq } from "drizzle-orm";
import type { DB } from "../../db/index.js";
import { firmsTable } from "../../db/schemas/firms.js";
import { jobsTable } from "../../db/schemas/jobs.js";
import { toCronExpression } from "../../utils/cron.js";
import { type LoadProductsFirmParam, loadProducts } from "../product.js";
import { createJob } from "./scheduler.js";

export async function runProductSyncJob(
  db: DB,
  serverCode: string,
  firmCode: number,
  jobId: number,
  firmInfo?: LoadProductsFirmParam,
) {
  await loadProducts(
    db,
    serverCode,
    {
      scf_stokkart_detay_listele: { firma_kodu: firmCode },
    },
    firmInfo,
  );

  await db
    .update(jobsTable)
    .set({ lastRanAt: new Date() })
    .where(eq(jobsTable.id, jobId));
}

export async function loadJobsFromDB(db: DB) {
  const rows = await db
    .select()
    .from(jobsTable)
    .innerJoin(firmsTable, eq(firmsTable.id, jobsTable.firmId));

  for (const { jobs, firms } of rows) {
    createJob(jobs.id, toCronExpression(jobs.frequency, jobs.unit), () =>
      runProductSyncJob(db, firms.diaServerCode, firms.diaFirmCode, jobs.id, {
        firmId: jobs.firmId,
        priceField: firms.priceField,
        maxProductNameCharacters: firms.maxProductNameCharacters,
      }).catch((err) => console.error("Job failed: ", err)),
    );
  }
}
