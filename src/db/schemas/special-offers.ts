import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import type { DiaSpecialOffer } from "../../types/dia-responses.js";
import { firmsTable } from "./firms.js";

export const specialOffersTable = pgTable(
  "special_offers",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    firmId: integer("firm_id")
      .references(() => firmsTable.id, { onDelete: "cascade" })
      .notNull(),
    diaKey: integer("dia_key").notNull(),
    // user-controlled — whether this offer contributes to product discount calculation.
    // defaults to true so a newly-fetched offer applies immediately, matching today's
    // all-active-offers-apply behavior; the admin can then opt specific offers out.
    enabled: boolean().notNull().default(true),
    name: text(),
    priority: text(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    // full raw DIA offer detail (incl. m_kalemler line items) — needed to re-run discount
    // matching later without a live DIA fetch (see computeDiscountsFromMatchKeys)
    diaData: jsonb("dia_data").$type<DiaSpecialOffer>(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    unique("special_offers_firm_dia_key_unique").on(t.firmId, t.diaKey),
    index("special_offers_firm_enabled_idx").on(t.firmId, t.enabled),
  ],
);

export const specialOffersFirmsRelations = relations(firmsTable, ({ many }) => ({
  specialOffers: many(specialOffersTable),
}));

export const specialOffersRelations = relations(specialOffersTable, ({ one }) => ({
  firm: one(firmsTable, {
    fields: [specialOffersTable.firmId],
    references: [firmsTable.id],
  }),
}));

export type InsertableSpecialOffer = typeof specialOffersTable.$inferInsert;
export type SelectableSpecialOffer = typeof specialOffersTable.$inferSelect;
