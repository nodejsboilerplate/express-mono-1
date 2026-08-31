import { ZodBase, type IdZType } from "@/zod";
import type z from "zod";

export class Validator {
  protected validate<T>(
    payload: unknown,
    schema: z.ZodType<T>
  ): z.ZodSafeParseResult<T> {
    const validatePayload = schema.safeParse(payload);
    if (validatePayload.error && !validatePayload.success) {
      return { error: validatePayload.error, success: false };
    }
    return { data: validatePayload.data, success: true };
  }

  idInput(payload: IdZType): IdZType | z.ZodError {
    const { data, success, error } = this.validate(payload, ZodBase.id);

    if (!success) {
      return error;
    }
    return data;
  }
}
