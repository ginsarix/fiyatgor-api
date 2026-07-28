ALTER TABLE "products" ADD COLUMN "discounted_price" numeric(18, 4);--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "discount_starts_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "discount_ends_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "discount_detail" text;