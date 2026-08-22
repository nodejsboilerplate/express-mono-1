ALTER TABLE "user_addresses" ALTER COLUMN "addr_line_1" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_addresses" ALTER COLUMN "city" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_addresses" ALTER COLUMN "country" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user_addresses" ALTER COLUMN "country_iso" DROP NOT NULL;