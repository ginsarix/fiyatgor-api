CREATE TYPE "public"."price_field_enum" AS ENUM('fiyat1', 'fiyat2', 'fiyat3', 'fiyat4', 'fiyat5', 'fiyat6', 'fiyat7', 'fiyat8', 'fiyat9', 'fiyat10');--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "priceField" "price_field_enum" DEFAULT 'fiyat1' NOT NULL;--> statement-breakpoint
ALTER TABLE "firms" ADD COLUMN "max_product_name_characters" integer;