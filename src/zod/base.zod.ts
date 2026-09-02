import z4 from "zod/v4";

export abstract class ZodBase {
  static id = z4.uuidv4({ error: "Invalid id" });
  static timestamps = z4.object({
    created_at: z4.coerce.date().optional(),
    updated_at: z4.coerce.date().optional(),
  });
  static verification = z4.object({
    is_verified: z4
      .boolean({ error: "is_verified must be a boolean" })
      .optional(),
    verify_code: z4
      .string()
      .max(10, { error: "Invalid verification code" })
      .trim()
      .nullish(),
    verify_expiry: z4.coerce.date().nullish(),
  });
}

export type IdZType = z4.infer<typeof ZodBase.id>;
export type TimestampsZtype = z4.infer<typeof ZodBase.timestamps>;
export type VerificationZtype = z4.infer<typeof ZodBase.verification>;
