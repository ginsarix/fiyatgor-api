import { eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { firmsTable } from "../db/schemas/firms.js";

export async function getFirmByServerCode(db: DB, serverCode: string) {
  return await db
    .select()
    .from(firmsTable)
    .where(eq(firmsTable.diaServerCode, serverCode));
}

export async function getFirmIdByServerCode(db: DB, serverCode: string) {
  const [firm] = await db
    .select({ id: firmsTable.id })
    .from(firmsTable)
    .where(eq(firmsTable.diaServerCode, serverCode));

  return firm ? firm.id : null;
}

export async function getFirmById(db: DB, id: number) {
  return await db.select().from(firmsTable).where(eq(firmsTable.id, id));
}
