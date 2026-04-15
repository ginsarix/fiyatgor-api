ALTER TABLE "firms" ADD COLUMN "firm_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "catalogs" ADD CONSTRAINT "catalogs_file_name_unique" UNIQUE("file_name");--> statement-breakpoint
ALTER TABLE "firms" ADD CONSTRAINT "firms_firm_code_unique" UNIQUE("firm_code");