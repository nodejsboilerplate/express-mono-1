import z4 from "zod";
import { Socials, USER_GENDERS, USER_ROLES } from "@/constants";

export class UserZValidation {
  // ---------------------------------------------------------
  // Users
  // ---------------------------------------------------------
  static user = z4.object({
    email: z4
      .email({ error: "Invalid email" })
      .min(1, { error: "Email is required" })
      .max(255, { error: "Email must be at most 255 characters" }),
    username: z4
      .string({ error: "Username is required" })
      .trim()
      .min(3, { error: "Username must be at least 3 characters" })
      .max(20, { error: "Username must be at most 20 characters" })
      .regex(/^[a-zA-Z0-9_.]+$/, {
        error:
          "Username can only contain letters, numbers, underscores, and dots",
      }),
    password: z4
      .string({ error: "Password is required" })
      .min(8, { error: "Password must be at least 8 characters" })
      .max(30, { error: "Password must be at most 30 characters" }),
    role: z4.enum(USER_ROLES, { error: "Invalid role" }).optional(),
  });

  // ---------------------------------------------------------
  // User Profiles
  // ---------------------------------------------------------
  static profile = z4.object({
    first_name: z4
      .string({ error: "First name must be a string" })
      .trim()
      .max(100, { error: "First name must be at most 100 characters" })
      .nullish(),
    last_name: z4
      .string({ error: "Last name must be a string" })
      .trim()
      .max(100, { error: "Last name must be at most 100 characters" })
      .nullish(),
    avatar: z4.url({ error: "Invalid avatar URL" }).nullish(),
    cover_img: z4.url({ error: "Invalid cover image URL" }).nullish(),
    nickname: z4
      .string({ error: "Nickname must be a string" })
      .trim()
      .max(100, { error: "Nickname must be at most 100 characters" })
      .nullish(),
    date_of_birth: z4.coerce.date({ error: "Invalid date of birth" }).nullish(),
    gender: z4.enum(USER_GENDERS, { error: "Invalid gender" }).nullish(),
  });

  // ---------------------------------------------------------
  // User Contacts
  // ---------------------------------------------------------
  static socialLink = z4.object({
    type: z4.enum(Socials, { error: "Invalid social platform type" }),
    url: z4.url({ error: "Invalid social link URL" }),
  });

  static contact = z4.object({
    socials: z4
      .array(this.socialLink, { error: "Socials must be an array" })
      .default([]),
  });

  // ---------------------------------------------------------
  // User Phone
  // ---------------------------------------------------------
  static phone = z4.object({
    is_verified: z4
      .boolean({ error: "is_verified must be a boolean" })
      .optional(),
    is_primary: z4
      .boolean({ error: "is_primary must be a boolean" })
      .optional(),
    phone_code: z4
      .string({ error: "Phone code is required" })
      .trim()
      .regex(/^\+?\d{1,5}$/, { error: "Invalid phone code" })
      .max(5, { error: "Phone code must be at most 5 characters" }),
    phone: z4
      .string({ error: "Phone number is required" })
      .trim()
      .regex(/^\d{4,20}$/, { error: "Invalid phone number" })
      .max(20, { error: "Phone number must be at most 20 characters" }),
  });

  // ---------------------------------------------------------
  // User Email
  // ---------------------------------------------------------
  static email = z4.object({
    is_verified: z4
      .boolean({ error: "is_verified must be a boolean" })
      .optional(),
    is_primary: z4
      .boolean({ error: "is_primary must be a boolean" })
      .optional(),
    email: z4
      .email({ error: "Invalid email" })
      .max(255, { error: "Email must be at most 255 characters" }),
  });

  // ---------------------------------------------------------
  // User Address
  // ---------------------------------------------------------
  static address = z4.object({
    addr_name: z4
      .string({ error: "Address name must be a string" })
      .trim()
      .max(100, { error: "Address name must be at most 100 characters" })
      .optional(),
    addr_line_1: z4
      .string({ error: "Address line 1 is required" })
      .trim()
      .min(1, { error: "Address line 1 is required" })
      .max(255, { error: "Address line 1 must be at most 255 characters" }),
    addr_line_2: z4
      .string({ error: "Address line 2 must be a string" })
      .trim()
      .max(255, { error: "Address line 2 must be at most 255 characters" })
      .optional(),
    city: z4
      .string({ error: "City is required" })
      .trim()
      .min(1, { error: "City is required" })
      .max(100, { error: "City must be at most 100 characters" }),
    state: z4
      .string({ error: "State must be a string" })
      .trim()
      .max(100, { error: "State must be at most 100 characters" })
      .optional(),
    post_code: z4
      .string({ error: "Post code must be a string" })
      .trim()
      .max(20, { error: "Post code must be at most 20 characters" })
      .optional(),
    country: z4
      .string({ error: "Country is required" })
      .trim()
      .min(1, { error: "Country is required" })
      .max(100, { error: "Country must be at most 100 characters" }),
    country_iso: z4
      .string({ error: "Country ISO code is required" })
      .trim()
      .length(2, { error: "country_iso must be a 2-letter ISO code" })
      .toUpperCase(),
    is_default: z4
      .boolean({ error: "is_default must be a boolean" })
      .optional(),
  });
}

export type CreateUserCoreInput = z4.infer<typeof UserZValidation.user>;
export type CreateUserProfileInput = z4.infer<typeof UserZValidation.profile>;
export type CreateUserContactInput = z4.infer<typeof UserZValidation.contact>;
export type CreateUserPhoneInput = z4.infer<typeof UserZValidation.phone>;
export type CreateUserEmailInput = z4.infer<typeof UserZValidation.email>;
export type CreateUserAddressInput = z4.infer<typeof UserZValidation.address>;
