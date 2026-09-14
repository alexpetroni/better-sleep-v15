ALTER TABLE "articles" ADD COLUMN "import_key" text;--> statement-breakpoint
ALTER TABLE "nurture_enrollments" ADD COLUMN "result_id" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "import_key" text;--> statement-breakpoint
ALTER TABLE "nurture_enrollments" ADD CONSTRAINT "nurture_enrollments_result_id_quiz_results_id_fk" FOREIGN KEY ("result_id") REFERENCES "public"."quiz_results"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "articles_import_key_uq" ON "articles" USING btree ("import_key");--> statement-breakpoint
CREATE UNIQUE INDEX "products_import_key_uq" ON "products" USING btree ("import_key");