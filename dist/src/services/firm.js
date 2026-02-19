import { eq } from "drizzle-orm";
import { firmsTable } from "../db/schemas/firms.js";
export async function getFirmByServerCode(db, serverCode) {
    return await db
        .select()
        .from(firmsTable)
        .where(eq(firmsTable.diaServerCode, serverCode));
}
export async function getFirmIdByServerCode(db, serverCode) {
    const [firm] = await db
        .select({ id: firmsTable.id })
        .from(firmsTable)
        .where(eq(firmsTable.diaServerCode, serverCode));
    return firm ? firm.id : null;
}
export async function getFirmById(db, id) {
    return await db.select().from(firmsTable).where(eq(firmsTable.id, id));
}
