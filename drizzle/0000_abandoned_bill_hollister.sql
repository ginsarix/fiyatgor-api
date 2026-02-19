CREATE TYPE "public"."product_status" AS ENUM('active', 'passive');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('admin', 'superadmin');--> statement-breakpoint
CREATE TABLE "equivalent_barcodes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "equivalent_barcodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"productId" integer NOT NULL,
	"dia_key" bigint NOT NULL,
	"barcode" text NOT NULL,
	CONSTRAINT "equivalent_barcodes_dia_key_unique" UNIQUE("dia_key"),
	CONSTRAINT "equivalent_barcodes_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "firms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "firms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" text NOT NULL,
	"dia_server_code" text NOT NULL,
	"dia_username" text NOT NULL,
	"dia_password" text NOT NULL,
	"dia_api_key" text NOT NULL,
	"dia_firm_code" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "firms_dia_server_code_unique" UNIQUE("dia_server_code")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"firm_id" integer NOT NULL,
	"dia_key" bigint NOT NULL,
	"stock_code" varchar(26) NOT NULL,
	"name" text NOT NULL,
	"price" numeric(18, 4) NOT NULL,
	"currency" char(3),
	"vat" integer,
	"stock_quantity" integer DEFAULT 0 NOT NULL,
	"status" "product_status" NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"unit" text DEFAULT 'AD' NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "products_dia_key_unique" UNIQUE("dia_key"),
	CONSTRAINT "products_stock_code_unique" UNIQUE("stock_code")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "users_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"firmId" integer NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" text NOT NULL,
	"role" "role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "equivalent_barcodes" ADD CONSTRAINT "equivalent_barcodes_productId_products_id_fk" FOREIGN KEY ("productId") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_firm_id_firms_id_fk" FOREIGN KEY ("firm_id") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_firmId_firms_id_fk" FOREIGN KEY ("firmId") REFERENCES "public"."firms"("id") ON DELETE cascade ON UPDATE no action;