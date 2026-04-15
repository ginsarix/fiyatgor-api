ALTER TABLE "products" DROP CONSTRAINT "products_stock_code_unique";--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "firm_stock_code_unique" UNIQUE("firm_id","stock_code");