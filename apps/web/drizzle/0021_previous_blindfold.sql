ALTER TABLE "articles" ADD COLUMN "import_key" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "import_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_import_key_uq" ON "articles" USING btree ("import_key");--> statement-breakpoint
CREATE UNIQUE INDEX "products_import_key_uq" ON "products" USING btree ("import_key");