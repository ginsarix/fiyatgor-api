import { relations } from "drizzle-orm";
import {
  char,
  decimal,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { barcodesTable } from "./barcodes.js";
import { firmsTable } from "./firms.js";

export const productStatusEnum = pgEnum("product_status", [
  "active",
  "passive",
]);

export const productsTable = pgTable("products", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(), // the upsert sometimes inserts ids idk man
  firmId: integer("firm_id")
    .references(() => firmsTable.id, { onDelete: "cascade" })
    .notNull(),
  diaKey: integer("dia_key").unique().notNull(),
  stockCode: varchar("stock_code", { length: 26 }).unique().notNull(),
  name: text().notNull(),
  price: decimal({ precision: 18, scale: 4 }).notNull(),
  currency: char({ length: 3 }),
  vat: integer(),
  stockQuantity: integer("stock_quantity").default(0).notNull(),
  status: productStatusEnum().notNull(),
  minQuantity: integer("min_quantity").default(1).notNull(),
  unit: text().default("AD").notNull(),
  image: text(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const firmsRelations = relations(firmsTable, ({ many }) => ({
  products: many(productsTable),
}));

export const productsRelations = relations(productsTable, ({ one, many }) => ({
  firm: one(firmsTable, {
    fields: [productsTable.firmId],
    references: [firmsTable.id],
  }),
  equivalentBarcodes: many(barcodesTable),
}));

export type InsertableProduct = typeof productsTable.$inferInsert;
export type SelectableProduct = typeof productsTable.$inferSelect;
