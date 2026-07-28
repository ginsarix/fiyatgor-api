import { eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { firmsTable } from "../db/schemas/firms.js";

export async function getFirmByFirmCode(db: DB, firmCode: string) {
  return await db
    .select()
    .from(firmsTable)
    .where(eq(firmsTable.firmCode, firmCode));
}

export async function getFirmByServerCode(db: DB, serverCode: string) {
  return await db
    .select()
    .from(firmsTable)
    .where(eq(firmsTable.diaServerCode, serverCode));
}

export async function getFirmIdByFirmCode(db: DB, firmCode: string) {
  const [firm] = await db
    .select({ id: firmsTable.id, discountsEnabled: firmsTable.discountsEnabled })
    .from(firmsTable)
    .where(eq(firmsTable.firmCode, firmCode));

  return firm ?? null;
}

export async function getFirmIdByServerCode(db: DB, serverCode: string) {
  const [firm] = await db
    .select({ id: firmsTable.id, discountsEnabled: firmsTable.discountsEnabled })
    .from(firmsTable)
    .where(eq(firmsTable.diaServerCode, serverCode));

  return firm ?? null;
}

export async function getFirmById(db: DB, id: number) {
  const [firm] = await db
    .select()
    .from(firmsTable)
    .where(eq(firmsTable.id, id));

  return firm;
}
