import z4 from "zod";

export function toNullish<T extends z4.ZodRawShape>(shape: T) {
  return Object.fromEntries(
    Object.entries(shape).map(([key, schema]) => [
      key,
      (schema as z4.ZodType).nullish(),
    ])
  ) as unknown as { [K in keyof T]: z4.ZodOptional<z4.ZodNullable<T[K]>> };
}
