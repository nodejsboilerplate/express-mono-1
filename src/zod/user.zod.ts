import z4 from "zod";
import {
  Socials,
  USER_ACCOUNT_PROVIDERS,
  USER_GENDERS,
  USER_ROLES,
} from "@/constants";
import { ZodBase } from "./base.zod";

export abstract class UserZSchema extends ZodBase {
  static email = z4
    .email({ error: "Invalid email" })
    .max(255, { error: "Email must be at most 255 characters" });

  static username = z4
    .string({ error: "Username is required" })
    .trim()
    .min(3, { error: "Username must be at least 3 characters" })
    .max(20, { error: "Username must be at most 20 characters" })
    .regex(/^[a-zA-Z0-9_.]+$/, {
      error:
        "Username can only contain letters, numbers, underscores, and dots",
    });

  // ---------------------------------------------------------
  // User
  // ---------------------------------------------------------
  static coreUser = z4
    .object({
      id: this.id,
      email: this.email,
      username: this.username,
      password: z4
        .string({ error: "Password is required" })
        .min(8, { error: "Password must be at least 8 characters" })
        .max(30, { error: "Password must be at most 30 characters" }),
      role: z4.enum(USER_ROLES, { error: "Invalid role" }).optional(),
      provider: z4.enum(USER_ACCOUNT_PROVIDERS, { error: "Invalid Provider" }),
    })
    .extend(this.timestamps.shape)
    .extend(this.verification.shape);

  static userProfile = z4
    .object({
      id: this.id,
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
      date_of_birth: z4.coerce
        .date({ error: "Invalid date of birth" })
        .nullish(),
      gender: z4.enum(USER_GENDERS, { error: "Invalid gender" }).nullish(),
    })
    .extend(this.timestamps.shape);

  static socialLink = z4.object({
    type: z4.enum(Socials, { error: "Invalid social platform type" }),
    url: z4.url({ error: "Invalid social link URL" }),
  });

  static userContact = z4
    .object({
      id: this.id,
      user_id: this.id,
      socials: z4
        .array(this.socialLink, { error: "Socials must be an array" })
        .default([])
        .optional(),
    })
    .extend(this.timestamps.shape);

  static userPhone = z4
    .object({
      id: this.id,
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
    })
    .extend(this.timestamps.shape)
    .extend(this.verification.shape);

  static userEmail = z4
    .object({
      id: this.id,
      contact_id: this.id,
      user_id: this.id,
      is_verified: z4
        .boolean({ error: "is_verified must be a boolean" })
        .optional(),
      is_primary: z4
        .boolean({ error: "is_primary must be a boolean" })
        .optional(),
      email: this.email,
    })
    .extend(this.timestamps.shape)
    .extend(this.verification.shape);

  static userAddress = z4
    .object({
      id: this.id,
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
    })
    .extend(this.timestamps.shape);

  // ---------------------------------------------------------
  // Create User
  // ---------------------------------------------------------
  static createUserWithProfile = z4.object({
    user: this.coreUser.omit({
      id: true,
      is_verified: true,
      verify_code: true,
      provider: true,
      verify_expiry: true,
      created_at: true,
      updated_at: true,
    }),
    profile: this.userProfile.omit({
      user_id: true,
      id: true,
      created_at: true,
      updated_at: true,
    }),
  });

  static createUserWithProfileByProvider = z4.object({
    user: this.coreUser.omit({
      id: true,
      password: true,
      provider: true,
      verify_code: true,
      verify_expiry: true,
      created_at: true,
      updated_at: true,
    }),
    profile: this.userProfile.omit({
      user_id: true,
      id: true,
      created_at: true,
      updated_at: true,
    }),
  });

  static createContact = this.userContact.omit({
    id: true,
    created_at: true,
    updated_at: true,
  });

  static createPhone = this.userPhone.omit({
    id: true,
    is_verified: true,
    verify_code: true,
    verify_expiry: true,
    created_at: true,
    updated_at: true,
  });

  static createEmail = this.userEmail.omit({
    id: true,
    is_verified: true,
    verify_code: true,
    verify_expiry: true,
    created_at: true,
    updated_at: true,
  });

  static createAddress = this.userAddress.omit({
    id: true,
    created_at: true,
    updated_at: true,
  });

  // ---------------------------------------------------------
  // Update
  // ---------------------------------------------------------
  static updateUser = this.coreUser
    .partial()
    .omit({
      created_at: true,
      updated_at: true,
    })
    .required({
      id: true,
    });

  static updateProfile = this.userProfile
    .partial()
    .omit({
      created_at: true,
      updated_at: true,
    })
    .required({
      id: true,
      user_id: true,
    });

  static updateContact = this.userContact
    .partial()
    .omit({
      created_at: true,
      updated_at: true,
    })
    .required({
      user_id: true,
    });

  static updatePhone = this.userPhone
    .partial()
    .omit({
      created_at: true,
      updated_at: true,
    })
    .required({
      id: true,
      user_id: true,
    });

  static updateEmail = this.userEmail
    .partial()
    .omit({
      created_at: true,
      updated_at: true,
    })
    .required({
      id: true,
      user_id: true,
    });

  static updateAddress = this.userAddress
    .partial()
    .omit({
      created_at: true,
      updated_at: true,
    })
    .required({
      id: true,
      user_id: true,
    });

  // ---------------------------------------------------------
  // Delete
  // ---------------------------------------------------------
  static userIdWithContextId = z4.object({
    id: this.id,
    user_id: this.id,
  });

  // ---------------------------------------------------------
  // Verification
  // ---------------------------------------------------------
  static verifyCode = z4
    .object({ id: this.id })
    .extend(this.verification.pick({ verify_code: true }).shape);

  static verifyCodeWithUserId = this.verifyCode.extend({
    user_id: this.id,
  });

  // ---------------------------------------------------------
  // Auth
  // ---------------------------------------------------------
  static loginUser = z4.object({
    identifier: z4.string({ error: "Invalid email or username!" }),
    password: z4.string({ error: "Password is required" }),
  });
}

export type EmailZType = z4.infer<typeof UserZSchema.email>;
export type UsernameZType = z4.infer<typeof UserZSchema.username>;

// ---------------------------------------------------------
// Zod types
// ---------------------------------------------------------
export type UserCoreZType = z4.infer<typeof UserZSchema.coreUser>;
export type UserProfileZType = z4.infer<typeof UserZSchema.userProfile>;
export type UserContactZType = z4.infer<typeof UserZSchema.userContact>;
export type UserPhoneZType = z4.infer<typeof UserZSchema.userPhone>;
export type UserEmailZType = z4.infer<typeof UserZSchema.userEmail>;
export type UserAddressZType = z4.infer<typeof UserZSchema.userAddress>;

// ---------------------------------------------------------
// Globals
// ---------------------------------------------------------

export type UserIdWithContextIdInputType = z4.infer<
  typeof UserZSchema.userIdWithContextId
>;

// ---------------------------------------------------------
// Create types
// ---------------------------------------------------------
export type CreateUserWithProfileInputType = z4.infer<
  typeof UserZSchema.createUserWithProfile
>;
export type CreateUserWithProfileByProviderInputType = z4.infer<
  typeof UserZSchema.createUserWithProfileByProvider
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
// Update types
// ---------------------------------------------------------
export type UpdateUserInputType = z4.infer<typeof UserZSchema.updateUser>;
export type UpdateProfileInputType = z4.infer<typeof UserZSchema.updateProfile>;
export type UpdateContactInputType = z4.infer<typeof UserZSchema.updateContact>;
export type UpdatePhoneInputType = z4.infer<typeof UserZSchema.updatePhone>;
export type UpdateEmailInputType = z4.infer<typeof UserZSchema.updateEmail>;
export type UpdateAddressInputType = z4.infer<typeof UserZSchema.updateAddress>;

// ---------------------------------------------------------
// Verification types
// ---------------------------------------------------------
export type VerifyCodeInputType = z4.infer<typeof UserZSchema.verifyCode>;
export type VerifyCodeWithUserIdInput = z4.infer<
  typeof UserZSchema.verifyCodeWithUserId
>;

// ---------------------------------------------------------
// Auth
// ---------------------------------------------------------
export type LoginUserInputType = z4.infer<typeof UserZSchema.loginUser>;
