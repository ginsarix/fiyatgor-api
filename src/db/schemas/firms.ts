import { integer, pgEnum, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const priceFieldEnum = pgEnum("price_field_enum", [
  "fiyat1",
  "fiyat2",
  "fiyat3",
  "fiyat4",
  "fiyat5",
  "fiyat6",
  "fiyat7",
  "fiyat8",
  "fiyat9",
  "fiyat10",
]);

export const firmsTable = pgTable("firms", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  firmCode: text("firm_code").notNull().unique(),
  name: text().notNull(),
  diaServerCode: text("dia_server_code").notNull().unique(),
  diaUsername: text("dia_username").notNull(),
  diaPassword: text("dia_password").notNull(),
  diaApiKey: text("dia_api_key").notNull(),
  diaFirmCode: integer("dia_firm_code").notNull(),
  diaPeriodCode: integer("dia_period_code").default(0),

  priceField: priceFieldEnum().notNull().default("fiyat1"),
  maxProductNameCharacters: integer("max_product_name_characters"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type InsertableFirm = typeof firmsTable.$inferInsert;
export type SelectableFirm = typeof firmsTable.$inferSelect;
