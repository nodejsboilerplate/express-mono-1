ALTER TABLE "user_emails" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user_phones" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_key" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "user_phones" ADD CONSTRAINT "user_phones_user_id_key" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_phones" ADD CONSTRAINT "user_phones_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;