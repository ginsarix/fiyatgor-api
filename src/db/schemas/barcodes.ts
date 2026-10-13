import { relations } from "drizzle-orm";
import { integer, pgTable, text, unique } from "drizzle-orm/pg-core";
import { firmsTable } from "./firms.js";
import { productsTable } from "./products.js";

export const barcodesTable = pgTable(
  "barcodes",
  {
    id: integer().primaryKey().generatedByDefaultAsIdentity(), // the upsert sometimes inserts ids idk man
    // denormalized from the product so barcodes can be unique per firm — different firms commonly
    // sell the same item under the same EAN/ISBN, so a globally unique barcode would let one firm's
    // sync steal the barcode from another firm's product
    firmId: integer("firm_id")
      .references(() => firmsTable.id, { onDelete: "cascade" })
      .notNull(),
    productId: integer("product_id")
      .references(() => productsTable.id, { onDelete: "cascade" })
      .notNull(),
    diaKey: integer("dia_key"),
    barcode: text().notNull(),
  },
  (t) => [unique("barcodes_firm_barcode_unique").on(t.firmId, t.barcode)],
);

export const barcodesRelations = relations(barcodesTable, ({ one }) => ({
  product: one(productsTable, {
    fields: [barcodesTable.productId],
    references: [productsTable.id],
  }),
}));

export type InsertableBarcode = typeof barcodesTable.$inferInsert;
export type SelectableBarcode = typeof barcodesTable.$inferSelect;
