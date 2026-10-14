import { eq } from "drizzle-orm";
import type { DB } from "../db/index.js";
import { firmsTable } from "../db/schemas/firms.js";
import { aesEncrypt } from "../utils/aes-256-gcm.js";

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

// DIA passwords are stored encrypted, every firm write that may carry one should go through this
export function withEncryptedDiaPassword<
  T extends { diaPassword?: string | null },
>(values: T): T {
  if (!values.diaPassword) return values;

  return { ...values, diaPassword: aesEncrypt(values.diaPassword) };
}
