import {
  boolean,
  decimal,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

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

export const firmsTable = pgTable(
  "firms",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    firmCode: text("firm_code").notNull().unique(),
    name: text().notNull(),
    diaServerCode: text("dia_server_code").unique(),
    diaUsername: text("dia_username"),
    diaPassword: text("dia_password"),
    diaApiKey: text("dia_api_key"),
    diaFirmCode: integer("dia_firm_code"),
    diaPeriodCode: integer("dia_period_code").default(0),

    priceField: priceFieldEnum().notNull().default("fiyat1"),
    maxProductNameCharacters: integer("max_product_name_characters"),
    // off by default — settable by the firm's own users (PATCH /admin/firm) or a superadmin
    discountsEnabled: boolean("discounts_enabled").notNull().default(false),
    // DIA credit estimate for the next sync, computed from the discount count seen on the last
    // sync that had discounts enabled — an estimate because discounts may change in DIA before
    // the next sync actually runs. null until a discounts-enabled sync has run at least once.
    estimatedNextSyncCost: decimal("estimated_next_sync_cost", {
      precision: 10,
      scale: 4,
    }),

    // start time of the last successful product sync (quick or full) — used as the lower bound
    // ("_date" filter, date granularity only — DIA ignores time-of-day here) for the next quick
    // sync's delta fetch. Null until a product sync has completed at least once, in which case a
    // quick sync isn't possible yet and a full sync must run first.
    lastProductSyncAt: timestamp("last_product_sync_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("firms_firm_code_idx").on(t.firmCode),
    index("firms_dia_server_code_idx").on(t.diaServerCode),
  ],
);

export type InsertableFirm = typeof firmsTable.$inferInsert;
export type SelectableFirm = typeof firmsTable.$inferSelect;
