CREATE TYPE "user_account_provider" AS ENUM('GOOGLE', 'GITHUB', 'DISCORD', 'MANUAL');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "provider" "user_account_provider" DEFAULT 'MANUAL'::"user_account_provider" NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;