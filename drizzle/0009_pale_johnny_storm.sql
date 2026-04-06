CREATE TABLE "catalogs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "catalogs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"file_name" text NOT NULL,
	"file_hash" text NOT NULL,
	"firm_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "catalogs_file_hash_unique" UNIQUE("file_hash")
);
--> statement-breakpoint
ALTER TABLE "catalogs" ADD CONSTRAINT "catalogs_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalogs_filename_idx" ON "catalogs" USING btree ("file_name");