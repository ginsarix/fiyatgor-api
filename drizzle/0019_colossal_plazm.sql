CREATE TABLE "special_offers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "special_offers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"firm_id" integer NOT NULL,
	"dia_key" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"name" text,
	"priority" text,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"dia_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "special_offers_firm_dia_key_unique" UNIQUE("firm_id","dia_key")
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dia_match_keys" jsonb;--> statement-breakpoint
ALTER TABLE "special_offers" ADD CONSTRAINT "special_offers_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "special_offers_firm_enabled_idx" ON "special_offers" USING btree ("firm_id","enabled");