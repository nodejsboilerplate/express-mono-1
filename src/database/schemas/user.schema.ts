import { pgTable, pgEnum } from "drizzle-orm/pg-core";
import * as t from "drizzle-orm/pg-core";
import { table_timestamps } from "./helper";
import { v4 as uuidv4 } from "uuid";
import { USER_GENDERS, USER_ROLES } from "@/constants";
import type { SocialLink } from "@/types";

// ---------------------------------------------------------
// Enums
// ---------------------------------------------------------
export const userRoleEnum = pgEnum("user_role", USER_ROLES);
export const userGenderRoleEnum = pgEnum("user_gender_role", USER_GENDERS);

// ---------------------------------------------------------
// Users
// ---------------------------------------------------------
export const users = pgTable("users", {
  id: t
    .uuid()
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  email: t.varchar({ length: 255 }).notNull().unique(),
  username: t.varchar({ length: 100 }).notNull().unique(),
  password: t.varchar({ length: 255 }).notNull(),
  is_verified: t.boolean().notNull().default(false),
  verify_code: t.varchar({ length: 10 }),
  verify_expiry: t.timestamp({ withTimezone: true }),
  role: userRoleEnum().notNull().default("USER"),
  ...table_timestamps,
});

// ---------------------------------------------------------
// User Profiles
// ---------------------------------------------------------
export const userProfiles = pgTable("user_profiles", {
  id: t
    .uuid()
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  user_id: t
    .uuid()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  first_name: t.varchar({ length: 100 }),
  last_name: t.varchar({ length: 100 }),
  avatar: t.text(),
  cover_img: t.text(),
  nickname: t.varchar({ length: 100 }),
  date_of_birth: t.date(),
  gender: userGenderRoleEnum(),
  ...table_timestamps,
});

// ---------------------------------------------------------
// User contacts
// ---------------------------------------------------------
export const userContacts = pgTable("user_contacts", {
  id: t
    .uuid()
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  user_id: t
    .uuid()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  socials: t.jsonb().$type<SocialLink[]>().notNull().default([]),
  ...table_timestamps,
});

// ---------------------------------------------------------
// User Phones
// ---------------------------------------------------------
export const userPhones = pgTable("user_phones", {
  id: t
    .uuid()
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  contact_id: t
    .uuid()
    .notNull()
    .references(() => userContacts.id, { onDelete: "cascade" }),
      user_id: t
    .uuid()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  is_verified: t.boolean().notNull().default(false),
  is_primary: t.boolean().notNull().default(false),
  phone_code: t.varchar({ length: 5 }).notNull(),
  phone: t.varchar({ length: 20 }).notNull(),
  ...table_timestamps,
});

// ---------------------------------------------------------
// User emails
// ---------------------------------------------------------
export const userEmails = pgTable("user_emails", {
  id: t
    .uuid()
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  contact_id: t
    .uuid()
    .notNull()
    .references(() => userContacts.id, { onDelete: "cascade" }),
      user_id: t
    .uuid()
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  is_verified: t.boolean().notNull().default(false),
  is_primary: t.boolean().notNull().default(false),
  email: t.varchar({ length: 255 }).notNull(),
  ...table_timestamps,
});

// ---------------------------------------------------------
// User Address
// ---------------------------------------------------------
export const userAddresses = pgTable("user_addresses", {
  id: t
    .uuid()
    .primaryKey()
    .$defaultFn(() => uuidv4()),
  user_id: t
    .uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  addr_name: t.varchar({ length: 100 }).notNull(),
  addr_line_1: t.varchar({ length: 255 }).notNull(),
  addr_line_2: t.varchar({ length: 255 }),
  city: t.varchar({ length: 100 }).notNull(),
  state: t.varchar({ length: 100 }),
  post_code: t.varchar({ length: 20 }),
  country: t.varchar({ length: 100 }).notNull(),
  country_iso: t.varchar({ length: 2 }).notNull(),
  is_default: t.boolean().notNull().default(false),
  ...table_timestamps,
});
