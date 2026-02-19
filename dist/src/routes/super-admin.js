import { zValidator } from "@hono/zod-validator";
import { hash as bcryptHash } from "bcrypt";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { firmsTable } from "../db/schemas/firms.js";
import { usersTable } from "../db/schemas/users.js";
import { authFormValidation, firmFormValidation } from "../validations/zod.js";
export function registerSuperAdminRoutes(app) {
    app.post("/superadmin/users", zValidator("json", authFormValidation.extend({
        name: z.string().min(1),
        firmId: z.number().int().positive(),
        role: z.enum(["admin", "superadmin"]),
    })), async (c) => {
        const input = c.req.valid("json");
        const [existingUser] = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, input.email));
        if (existingUser)
            return c.json({ message: "Bu e-posta ile bir kullanıcı zaten kayıtlı" }, 409);
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
        return c.json({ message: "Kullanıcı başarıyla oluşturuldu", createdUser }, 201);
    });
    app.get("/superadmin/firms", async (c) => {
        const firms = await db.select().from(firmsTable);
        const strippedFirms = firms.map((f) => ({
            id: f.id,
            name: f.name,
            diaServerCode: f.diaServerCode,
            diaFirmCode: f.diaFirmCode,
            createdAt: f.createdAt,
        }));
        return c.json({ message: "Firmalar başarıyla getirildi", firms: strippedFirms }, 200);
    });
    app.get("/superadmin/firm/:id", async (c) => {
        const id = c.req.param("id");
        const [firm] = await db
            .select()
            .from(firmsTable)
            .where(eq(firmsTable.id, Number(id)));
        if (!firm)
            return c.json({ message: "Firma bulunamadı" }, 404);
        return c.json({ message: "Firma başarıyla getirildi" }, 200);
    });
    app.post("/superadmin/firms", zValidator("json", firmFormValidation), async (c) => {
        const input = c.req.valid("json");
        const [createdFirm] = await db
            .insert(firmsTable)
            .values(input)
            .returning();
        c.header("Location", `/superadmin/firm/${createdFirm.id}`);
        return c.json({ message: "Firma başarıyla oluşturuldu", createdFirm }, 201);
    });
}
