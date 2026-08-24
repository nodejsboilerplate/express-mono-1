import z4 from "zod";
import { Socials, USER_GENDERS, USER_ROLES } from "@/constants";

export class UserZSchema {
  // ===========================================================
  // Shared: id validator
  // ===========================================================

  // ┌─────────────────────────┐
  // │ Create Validations      │
  // └─────────────────────────┘
  static id = z4.uuidv4({ error: "Invalid id" });
  // ===========================================================
  // Users
  // ===========================================================
  static createUser = z4.object({
    email: z4
      .email({ error: "Invalid email" })

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

  // ===========================================================
  // User Profiles
  // ===========================================================
  static createProfile = z4.object({
    user_id: this.id,
    first_name: z4
      .string({ error: "First name must be a string" })
      .trim()
      .max(100, { error: "First name must be at most 100 characters" }),
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

  // ===========================================================
  // User Contacts
  // ===========================================================
  static socialLink = z4.object({
    type: z4.enum(Socials, { error: "Invalid social platform type" }),
    url: z4.url({ error: "Invalid social link URL" }),
  });

  static createContact = z4.object({
    user_id: this.id,
    socials: z4
      .array(this.socialLink, { error: "Socials must be an array" })
      .default([])
      .optional(),
  });

  // ===========================================================
  // User Phone
  // ===========================================================
  static createPhone = z4.object({
    contact_id: this.id,
    user_id: this.id,
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

  // ===========================================================
  // User Email
  // ===========================================================
  static createEmail = z4.object({
    contact_id: this.id,
    user_id: this.id,
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

  // ===========================================================
  // User Address
  // ===========================================================
  static createAddress = z4.object({
    user_id: this.id,
    addr_name: z4
      .string({ error: "Address name must be a text" })

      .trim()
      .max(100, { error: "Address name must be at most 100 characters" }),
    addr_line_1: z4
      .string({ error: "Address line 1 details must be a text" })

      .trim()
      .max(255, { error: "Address line 1 must be at most 255 characters" }),
    addr_line_2: z4
      .string({ error: "Address line 2 must be a text" })
      .trim()
      .max(255, { error: "Address line 2 must be at most 255 characters" })
      .optional(),
    city: z4
      .string({ error: "City must be a text" })
      .trim()

      .max(100, { error: "City must be at most 100 characters" }),
    state: z4
      .string({ error: "State must be a text" })
      .trim()
      .max(100, { error: "State must be at most 100 characters" })
      .optional(),
    post_code: z4
      .string({ error: "Post code must be a text" })
      .trim()
      .max(20, { error: "Post code must be at most 20 characters" })
      .optional(),
    country: z4
      .string({ error: "Country must be a text" })
      .trim()

      .max(100, { error: "Country must be at most 100 characters" }),
    country_iso: z4
      .string({ error: "Country ISO code must be a text" })

      .trim()
      .length(2, { error: "country_iso must be a 2-letter ISO code" })
      .toUpperCase(),
    is_default: z4
      .boolean({ error: "is_default must be a boolean" })
      .optional(),
  });

  static verifyCode = z4.object({
    id: this.id,
    code: z4
      .string({ error: "Code is required" })
      .trim()
      .regex(/^\d{6}$/, { error: "Code must be a 6-digit number" }),
  });

  static verifyCodeWithUserId = this.verifyCode.extend({
    user_id: this.id,
  });

  // ┌─────────────────────────────────────────────────────┐
  // │ Update Validations                                  │
  // │ All fields optional (partial update) + id required  │
  // └─────────────────────────────────────────────────────┘

  static updateUser = this.createUser.partial().extend({
    id: this.id,
    is_verified: z4
      .boolean({ error: "is_verified must be a boolean" })
      .optional(),
    verify_code: z4
      .string({ error: "verify_code must be a string" })
      .max(10, { error: "verify_code must be at most 10 characters" })
      .nullish(),
    verify_expiry: z4.coerce.date({ error: "Invalid verify_expiry" }).nullish(),
  });

  static updateProfile = this.createProfile.partial().extend({
    id: this.id,
    user_id: this.createProfile.shape.user_id,
  });

  static updateContact = this.createContact.partial().extend({
    user_id: this.createContact.shape.user_id,
  });

  static updatePhone = this.createPhone.partial().extend({
    id: this.id,
    user_id: this.createPhone.shape.user_id,
  });

  static updateEmail = this.createEmail.partial().extend({
    id: this.id,
    user_id: this.createEmail.shape.user_id,
  });

  static updateAddress = this.createAddress.partial().extend({
    id: this.id,
    user_id: this.createAddress.shape.user_id,
  });

  static deleteByUserWithContextId = z4.object({
    id: this.id,
    user_id: this.id,
  });
}

export type IdInputType = z4.infer<typeof UserZSchema.id>;
// ---------------------------------------------------------
// Create types
// ---------------------------------------------------------
export type CreateUserCoreInputType = z4.infer<typeof UserZSchema.createUser>;
export type CreateUserProfileInputType = z4.infer<
  typeof UserZSchema.createProfile
>;
export type CreateUserContactInputType = z4.infer<
  typeof UserZSchema.createContact
>;
export type CreateUserPhoneInputType = z4.infer<typeof UserZSchema.createPhone>;
export type CreateUserEmailInputType = z4.infer<typeof UserZSchema.createEmail>;
export type CreateUserAddressInputType = z4.infer<
  typeof UserZSchema.createAddress
>;

// ---------------------------------------------------------
// Verification types
// ---------------------------------------------------------
export type VerifyCodeInputType = z4.infer<typeof UserZSchema.verifyCode>;
export type VerifyCodeWithUserIdInput = z4.infer<
  typeof UserZSchema.verifyCodeWithUserId
>;

// ---------------------------------------------------------
// Update types
// ---------------------------------------------------------
export type UpdateUserInputType = z4.infer<typeof UserZSchema.updateUser>;
export type UpdateProfileInputType = z4.infer<typeof UserZSchema.updateProfile>;
export type UpdateContactInputType = z4.infer<typeof UserZSchema.updateContact>;
export type UpdatePhoneInputType = z4.infer<typeof UserZSchema.updatePhone>;
export type UpdateEmailInputType = z4.infer<typeof UserZSchema.updateEmail>;
export type UpdateAddressInputType = z4.infer<typeof UserZSchema.updateAddress>;

// ---------------------------------------------------------
// Delete types
// ---------------------------------------------------------
export type DeleteByUserWithContextIdInputType = z4.infer<
  typeof UserZSchema.deleteByUserWithContextId
>;
