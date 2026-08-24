ALTER TABLE "user_emails" ADD COLUMN "verify_code" varchar(10);--> statement-breakpoint
ALTER TABLE "user_emails" ADD COLUMN "verify_expiry" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_phones" ADD COLUMN "verify_code" varchar(10);--> statement-breakpoint
ALTER TABLE "user_phones" ADD COLUMN "verify_expiry" timestamp with time zone;