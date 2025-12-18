ALTER TABLE "idempotency_keys" RENAME COLUMN "id" TO "key";--> statement-breakpoint
ALTER TABLE "idempotency_keys" DROP CONSTRAINT "idempotency_keys_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "expenses" ALTER COLUMN "total_amount" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "expense_shares" ALTER COLUMN "share_amount" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "settlements" ALTER COLUMN "amount" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "paid_by" text NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD COLUMN "endpoint" text NOT NULL;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD COLUMN "response_body" jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paid_by_user_id_fk" FOREIGN KEY ("paid_by") REFERENCES "public"."user"("id") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "amount_positive" CHECK ("expenses"."total_amount" > 0);--> statement-breakpoint
ALTER TABLE "expense_shares" ADD CONSTRAINT "amount_positive" CHECK ("expense_shares"."share_amount" > 0);--> statement-breakpoint
ALTER TABLE "settlements" ADD CONSTRAINT "amount_positive" CHECK ("settlements"."amount" > 0);