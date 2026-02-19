import { relations } from "drizzle-orm";
import { integer, pgEnum, pgTable, timestamp } from "drizzle-orm/pg-core";
import { firmsTable } from "./firms.js";

export const jobFrequencyUnitEnum = pgEnum("job_frequency_unit", [
  "minute",
  "hour",
  "day",
  "month",
]);

export const jobsTable = pgTable("jobs", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  firmId: integer("firm_id")
    .references(() => firmsTable.id, { onDelete: "cascade" })
    .unique()
    .notNull(),
  frequency: integer().notNull(),
  unit: jobFrequencyUnitEnum().notNull(),
  lastRanAt: timestamp("last_ran_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const jobsFirmsRelations = relations(firmsTable, ({ many }) => ({
  jobs: many(jobsTable),
}));

export const jobsRelations = relations(jobsTable, ({ one }) => ({
  firm: one(firmsTable, {
    fields: [jobsTable.firmId],
    references: [firmsTable.id],
  }),
}));

export type InsertableJob = typeof jobsTable.$inferInsert;
export type SelectableJob = typeof jobsTable.$inferSelect;
