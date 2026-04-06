import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { firmsTable } from "./firms.js";

export const catalogsTable = pgTable(
  "catalogs",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    filename: text("file_name").notNull().unique(),
    fileHash: text("file_hash").notNull().unique(),
    firmId: integer("firm_id")
      .references(() => firmsTable.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("catalogs_filename_idx").on(t.filename)],
);

export const catalogFirmsRelations = relations(firmsTable, ({ many }) => ({
  catalogs: many(catalogsTable),
}));

export const catalogsRelations = relations(catalogsTable, ({ one }) => ({
  firm: one(firmsTable, {
    fields: [catalogsTable.firmId],
    references: [firmsTable.id],
  }),
}));

export type InsertableCatalog = typeof catalogsTable.$inferInsert;
export type SelectableCatalog = typeof catalogsTable.$inferSelect;
