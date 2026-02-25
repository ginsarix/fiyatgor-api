import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { productsTable } from "./products.js";

export const barcodesTable = pgTable("barcodes", {
  id: integer().primaryKey().generatedByDefaultAsIdentity(), // the upsert sometimes inserts ids idk man
  productId: integer("product_id")
    .references(() => productsTable.id, { onDelete: "cascade" })
    .notNull(),
  diaKey: integer("dia_key").notNull(),
  barcode: text().unique().notNull(),
});

export const barcodesRelations = relations(barcodesTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [barcodesTable.productId],
    references: [productsTable.id],
  }),
}));

export type InsertableBarcode = typeof barcodesTable.$inferInsert;
export type SelectableBarcode = typeof barcodesTable.$inferSelect;
