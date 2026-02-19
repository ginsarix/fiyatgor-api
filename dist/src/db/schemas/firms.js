import { integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
export const firmsTable = pgTable("firms", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    name: text().notNull(),
    diaServerCode: text("dia_server_code").notNull().unique(),
    diaUsername: text("dia_username").notNull(),
    diaPassword: text("dia_password").notNull(),
    diaApiKey: text("dia_api_key").notNull(),
    diaFirmCode: integer("dia_firm_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .$onUpdate(() => new Date()),
});
