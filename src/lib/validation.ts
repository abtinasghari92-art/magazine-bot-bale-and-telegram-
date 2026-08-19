import { z, type ZodType } from "zod";

export class ValidationError extends Error {
  readonly status = 400;
  readonly details: z.ZodIssue[];

  constructor(issues: z.ZodIssue[]) {
    super("Invalid request");
    this.name = "ValidationError";
    this.details = issues;
  }
}

export function parseWithSchema<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }
  return result.data;
}
