import { relations } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { firmsTable } from "./firms.js";

export const roleEnum = pgEnum("role", ["admin", "superadmin"]);

export const usersTable = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  firmId: integer("firm_id")
    .references(() => firmsTable.id, { onDelete: "cascade" })
    .notNull(),
  name: text().notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  password: text().notNull(),
  role: roleEnum().default("admin").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const userFirmsRelations = relations(firmsTable, ({ many }) => ({
  users: many(usersTable),
}));

export const usersRelations = relations(usersTable, ({ one }) => ({
  firm: one(firmsTable, {
    fields: [usersTable.firmId],
    references: [firmsTable.id],
  }),
}));

export type InsertableUser = typeof usersTable.$inferInsert;
export type SelectableUser = typeof usersTable.$inferSelect;
