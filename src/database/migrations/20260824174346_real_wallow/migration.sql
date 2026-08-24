CREATE TYPE "user_gender_role" AS ENUM('MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY');--> statement-breakpoint
CREATE TYPE "user_role" AS ENUM('ADMIN', 'USER');--> statement-breakpoint
CREATE TABLE "user_addresses" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL,
	"addr_name" varchar(100) NOT NULL,
	"addr_line_1" varchar(255) NOT NULL,
	"addr_line_2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(100),
	"post_code" varchar(20),
	"country" varchar(100) NOT NULL,
	"country_iso" varchar(2) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_contacts" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL UNIQUE,
	"socials" jsonb DEFAULT '[]' NOT NULL,
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_emails" (
	"id" uuid PRIMARY KEY,
	"contact_id" uuid NOT NULL,
	"user_id" uuid NOT NULL UNIQUE,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verify_code" varchar(10),
	"verify_expiry" timestamp with time zone,
	"is_primary" boolean DEFAULT false NOT NULL,
	"email" varchar(255) NOT NULL,
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_phones" (
	"id" uuid PRIMARY KEY,
	"contact_id" uuid NOT NULL,
	"user_id" uuid NOT NULL UNIQUE,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verify_code" varchar(10),
	"verify_expiry" timestamp with time zone,
	"is_primary" boolean DEFAULT false NOT NULL,
	"phone_code" varchar(5) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profiles" (
	"id" uuid PRIMARY KEY,
	"user_id" uuid NOT NULL UNIQUE,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100),
	"avatar" text,
	"cover_img" text,
	"nickname" varchar(100),
	"date_of_birth" date,
	"gender" "user_gender_role",
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY,
	"email" varchar(255) NOT NULL UNIQUE,
	"username" varchar(100) NOT NULL UNIQUE,
	"password" varchar(255) NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"verify_code" varchar(10),
	"verify_expiry" timestamp with time zone,
	"role" "user_role" DEFAULT 'USER'::"user_role" NOT NULL,
	"updated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_contacts" ADD CONSTRAINT "user_contacts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_contact_id_user_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "user_contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_emails" ADD CONSTRAINT "user_emails_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_phones" ADD CONSTRAINT "user_phones_contact_id_user_contacts_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "user_contacts"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_phones" ADD CONSTRAINT "user_phones_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "user_profiles" ADD CONSTRAINT "user_profiles_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;