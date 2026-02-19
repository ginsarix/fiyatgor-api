import { relations } from "drizzle-orm";
import { integer, pgTable, text } from "drizzle-orm/pg-core";
import { productsTable } from "./products.js";
export const barcodesTable = pgTable("equivalent_barcodes", {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    productId: integer("product_id")
        .references(() => productsTable.id, { onDelete: "cascade" })
        .notNull(),
    diaKey: integer("dia_key").notNull(),
    barcode: text().unique().notNull(),
});
export const equivalentBarcodesRelations = relations(barcodesTable, ({ one }) => ({
    product: one(productsTable, {
        fields: [barcodesTable.productId],
        references: [productsTable.id],
    }),
}));
