ALTER TABLE "firms" ALTER COLUMN "dia_server_code" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "firms" ALTER COLUMN "dia_username" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "firms" ALTER COLUMN "dia_password" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "firms" ALTER COLUMN "dia_api_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "firms" ALTER COLUMN "dia_firm_code" DROP NOT NULL;--> statement-breakpoint
CREATE INDEX "firms_firm_code_idx" ON "firms" USING btree ("firm_code");--> statement-breakpoint
CREATE INDEX "firms_dia_server_code_idx" ON "firms" USING btree ("dia_server_code");--> statement-breakpoint
CREATE INDEX "products_firm_stock_code_idx" ON "products" USING btree ("firm_id","stock_code");--> statement-breakpoint
CREATE INDEX "products_firm_name_idx" ON "products" USING btree ("firm_id","name");--> statement-breakpoint
CREATE INDEX "products_firm_price_idx" ON "products" USING btree ("firm_id","price");--> statement-breakpoint
CREATE INDEX "products_firm_created_at_idx" ON "products" USING btree ("firm_id","created_at");