import { describe, expect, it } from "vitest";

import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { FieldValidationError, ValidationError } from "@/lib/validation";
import { mapErrorToApiResponse } from "@/server/error-mapping";

/**
 * Regression test for the Day 2 defect: a Prisma validation error reached the
 * Mini App and showed the user our query, our model names and a stack trace.
 *
 * Everything a route can throw goes through `mapErrorToApiResponse`, so this is
 * the one place to prove nothing internal escapes.
 */

/** Build an error that looks to the mapper exactly like the real Prisma class. */
function prismaError(name: string, message: string, code?: string): Error & { code?: string } {
  const error = new Error(message) as Error & { code?: string };
  error.name = name;
  if (code) error.code = code;
  return error;
}

/** Substrings that must never appear in a response body, whatever was thrown. */
const FORBIDDEN_FRAGMENTS = [
  "prisma",
  "PrismaClient",
  "postgres",
  "postgresql",
  "invocation",
  "at Object.",
  "at async",
  "node_modules",
  "MagazineIssue",
  "magazine_issue",
  "SELECT",
  "INSERT",
  "5432",
  "DATABASE_URL",
  "localhost",
  "Unknown argument",
  "stack",
];

function assertNothingLeaked(body: unknown): void {
  const serialized = JSON.stringify(body);
  for (const fragment of FORBIDDEN_FRAGMENTS) {
    expect(serialized.toLowerCase()).not.toContain(fragment.toLowerCase());
  }
}

describe("public error mapping", () => {
  it("never returns a Prisma validation message to the browser", () => {
    // This is close to the text that actually reached a user on Day 2.
    const raw = prismaError(
      "PrismaClientValidationError",
      `Invalid \`prisma.magazineIssue.findMany()\` invocation in
/app/src/server/repositories/catalog-repository.ts:120:45

Unknown argument \`titel\`. Available options are marked with ?.`,
    );

    const { status, body } = mapErrorToApiResponse(raw);

    expect(status).toBe(500);
    expect(body.code).toBe("internal_error");
    expect(body.error).toBe("خطای داخلی سامانه. لطفاً دوباره تلاش کنید.");
    assertNothingLeaked(body);
  });

  it.each([
    ["PrismaClientKnownRequestError", "P2002", 409],
    ["PrismaClientKnownRequestError", "P2025", 404],
    ["PrismaClientInitializationError", "P1001", 503],
    ["PrismaClientRustPanicError", undefined, 500],
    ["PrismaClientUnknownRequestError", undefined, 500],
  ] as const)("maps %s (%s) to a safe %i response", (name, code, expectedStatus) => {
    const raw = prismaError(
      name,
      "Can't reach database server at `db.internal.example:5432` — connection string postgresql://user:secret@db.internal.example:5432/magazine",
      code,
    );

    const { status, body } = mapErrorToApiResponse(raw);

    expect(status).toBe(expectedStatus);
    expect(body.error).not.toContain("secret");
    assertNothingLeaked(body);
  });

  it("never returns the message of an unknown exception", () => {
    const raw = new Error(
      "connect ECONNREFUSED 10.0.0.5:5432 while running SELECT * FROM \"MagazineIssue\"",
    );

    const { status, body } = mapErrorToApiResponse(raw);

    expect(status).toBe(500);
    expect(body.error).toBe("خطای داخلی سامانه. لطفاً دوباره تلاش کنید.");
    expect(body.error).not.toContain("ECONNREFUSED");
    assertNothingLeaked(body);
  });

  it("never returns a stack trace, even for a thrown non-Error", () => {
    for (const raw of [null, undefined, "boom", 42, { stack: "at Object.<anonymous>" }]) {
      const { status, body } = mapErrorToApiResponse(raw);
      expect(status).toBe(500);
      expect(body).not.toHaveProperty("stack");
      assertNothingLeaked(body);
    }
  });

  it("attaches a correlation id to server-side failures so operators can find the log", () => {
    const { body } = mapErrorToApiResponse(new Error("internal detail"));
    expect(body.errorId).toMatch(/^[0-9a-f]{8}$/);
  });

  it("passes through the Persian message of a deliberate application error", () => {
    const { status, body } = mapErrorToApiResponse(
      new NotFoundError("شماره موردنظر یافت نشد.", "no published issue for slug foo"),
    );

    expect(status).toBe(404);
    expect(body.code).toBe("not_found");
    expect(body.error).toBe("شماره موردنظر یافت نشد.");
    // The internal half of the error must not travel with it.
    expect(JSON.stringify(body)).not.toContain("no published issue");
  });

  it("does not leak the internal message of a 5xx application error", () => {
    const { status, body } = mapErrorToApiResponse(
      new AppError("unavailable", "سرویس در دسترس نیست.", "s3 endpoint refused connection"),
    );

    expect(status).toBe(503);
    expect(body.error).toBe("سرویس در دسترس نیست.");
    expect(JSON.stringify(body)).not.toContain("s3 endpoint");
  });

  it("returns field issues for validation errors without exposing internals", () => {
    const { status, body } = mapErrorToApiResponse(
      new FieldValidationError([{ field: "page", message: "شماره صفحه معتبر نیست." }]),
    );

    expect(status).toBe(400);
    expect(body.code).toBe("invalid_request");
    expect(body.issues).toEqual([{ field: "page", message: "شماره صفحه معتبر نیست." }]);
    assertNothingLeaked(body);
  });

  it("keeps a conflict message user-facing", () => {
    const { status, body } = mapErrorToApiResponse(
      new ConflictError("شماره‌ای با این عدد قبلاً ثبت شده است."),
    );

    expect(status).toBe(409);
    expect(body.code).toBe("conflict");
    assertNothingLeaked(body);
  });

  it("reports a Zod failure as field issues, not as a raw Zod dump", () => {
    const zodIssues = [
      {
        code: "invalid_type" as const,
        expected: "string" as const,
        received: "undefined" as const,
        path: ["title"],
        message: "عنوان الزامی است.",
      },
    ];

    const { status, body } = mapErrorToApiResponse(new ValidationError(zodIssues));

    expect(status).toBe(400);
    expect(body.issues).toEqual([{ field: "title", message: "عنوان الزامی است." }]);
    assertNothingLeaked(body);
  });
});
