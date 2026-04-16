ALTER TABLE "barcodes" ALTER COLUMN "dia_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "dia_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "status" SET DEFAULT 'active';