ALTER TABLE "groups" ADD COLUMN IF NOT EXISTS "currency" text DEFAULT 'INR' NOT NULL;
--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'general';
