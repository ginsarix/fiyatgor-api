ALTER TABLE "barcodes" DROP CONSTRAINT "barcodes_barcode_unique";--> statement-breakpoint
ALTER TABLE "barcodes" ADD COLUMN "firm_id" integer;--> statement-breakpoint
UPDATE "barcodes" SET "firm_id" = "products"."firm_id" FROM "products" WHERE "products"."id" = "barcodes"."product_id";--> statement-breakpoint
ALTER TABLE "barcodes" ALTER COLUMN "firm_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_firm_barcode_unique" UNIQUE("firm_id","barcode");
