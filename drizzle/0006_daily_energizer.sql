CREATE TABLE "barcodes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "barcodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"product_id" integer NOT NULL,
	"dia_key" integer NOT NULL,
	"barcode" text NOT NULL,
	CONSTRAINT "barcodes_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
DROP TABLE "equivalent_barcodes" CASCADE;--> statement-breakpoint
ALTER TABLE "barcodes" ADD CONSTRAINT "barcodes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
