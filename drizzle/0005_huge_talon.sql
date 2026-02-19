ALTER TYPE "public"."job_frequency_unit" ADD VALUE 'minute' BEFORE 'hour';--> statement-breakpoint
ALTER TABLE "equivalent_barcodes" RENAME COLUMN "productId" TO "product_id";--> statement-breakpoint
ALTER TABLE "users" RENAME COLUMN "firmId" TO "firm_id";--> statement-breakpoint
ALTER TABLE "equivalent_barcodes" DROP CONSTRAINT "equivalent_barcodes_productId_products_id_fk";
--> statement-breakpoint
ALTER TABLE "users" DROP CONSTRAINT "users_firmId_firms_id_fk";
--> statement-breakpoint
ALTER TABLE "equivalent_barcodes" ADD CONSTRAINT "equivalent_barcodes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;