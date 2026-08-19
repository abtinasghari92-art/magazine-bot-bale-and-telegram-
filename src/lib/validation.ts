import { z, type ZodType } from "zod";

export type FieldIssue = {
  field: string;
  message: string;
};

export class ValidationError extends Error {
  readonly status = 400;
  readonly details: z.ZodIssue[];

  constructor(issues: z.ZodIssue[]) {
    super("Invalid request");
    this.name = "ValidationError";
    this.details = issues;
  }
}

/** Validation failure that already carries user-facing (Persian) field messages. */
export class FieldValidationError extends Error {
  readonly status = 400;
  readonly issues: FieldIssue[];

  constructor(issues: FieldIssue[], message = "Invalid request") {
    super(message);
    this.name = "FieldValidationError";
    this.issues = issues;
  }
}

export function parseWithSchema<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError(result.error.issues);
  }
  return result.data;
}

export function toFieldIssues(issues: z.ZodIssue[]): FieldIssue[] {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "_",
    message: issue.message,
  }));
}
