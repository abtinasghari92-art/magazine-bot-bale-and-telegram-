import { randomUUID } from "node:crypto";

import { AppError, type AppErrorCode } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  FieldValidationError,
  ValidationError,
  toFieldIssues,
  type FieldIssue,
} from "@/lib/validation";

/**
 * The single place a thrown value becomes an HTTP response body.
 *
 * Nothing internal crosses this boundary in any environment: no stack traces,
 * no Prisma messages, no SQL, no connection strings, no table or column names.
 * Operators get the detail from the server log, correlated by `errorId`; the
 * browser only ever sees a Persian sentence and a stable machine code.
 */

export type ApiErrorCode = AppErrorCode | "internal_error";

export type ApiErrorBody = {
  error: string;
  code: ApiErrorCode;
  issues?: FieldIssue[];
  /** Correlates the user-visible failure with the server log entry. */
  errorId?: string;
};

export type MappedError = {
  status: number;
  body: ApiErrorBody;
};

const GENERIC_MESSAGE = "خطای داخلی سامانه. لطفاً دوباره تلاش کنید.";
const INVALID_REQUEST_MESSAGE = "اطلاعات واردشده معتبر نیست.";
const CONFLICT_MESSAGE = "این عملیات با داده‌های فعلی سازگار نیست.";
const NOT_FOUND_MESSAGE = "مورد درخواستی یافت نشد.";
const UNAVAILABLE_MESSAGE = "سرویس موقتاً در دسترس نیست. کمی بعد دوباره تلاش کنید.";

/** Prisma error class names. Matched by name so `@prisma/client` stays out of this module. */
const PRISMA_ERROR_NAMES = new Set([
  "PrismaClientKnownRequestError",
  "PrismaClientUnknownRequestError",
  "PrismaClientRustPanicError",
  "PrismaClientInitializationError",
  "PrismaClientValidationError",
]);

function isPrismaError(error: unknown): error is Error & { code?: string } {
  return error instanceof Error && PRISMA_ERROR_NAMES.has(error.name);
}

function newErrorId(): string {
  return randomUUID().slice(0, 8);
}

/**
 * Map a Prisma failure onto a public code. The Prisma error code (`P2002`, …)
 * is a stable Prisma constant, never customer data, so it is safe to log — but
 * it is not returned to the browser either, because it names our storage layer.
 */
function mapPrismaError(error: Error & { code?: string }): MappedError {
  const errorId = newErrorId();
  logger.error("Database error", error, { errorId, prismaCode: error.code });

  switch (error.code) {
    case "P2002":
      return {
        status: 409,
        body: { error: CONFLICT_MESSAGE, code: "conflict", errorId },
      };
    case "P2025":
      return {
        status: 404,
        body: { error: NOT_FOUND_MESSAGE, code: "not_found", errorId },
      };
    case "P1001":
    case "P1002":
    case "P1008":
    case "P1017":
      return {
        status: 503,
        body: { error: UNAVAILABLE_MESSAGE, code: "unavailable", errorId },
      };
    default:
      return {
        status: 500,
        body: { error: GENERIC_MESSAGE, code: "internal_error", errorId },
      };
  }
}

export function mapErrorToApiResponse(error: unknown): MappedError {
  if (error instanceof FieldValidationError) {
    return {
      status: error.status,
      body: {
        error: INVALID_REQUEST_MESSAGE,
        code: "invalid_request",
        issues: error.issues,
      },
    };
  }

  if (error instanceof ValidationError) {
    return {
      status: error.status,
      body: {
        error: INVALID_REQUEST_MESSAGE,
        code: "invalid_request",
        issues: toFieldIssues(error.details),
      },
    };
  }

  if (error instanceof AppError) {
    if (error.status >= 500) {
      const errorId = newErrorId();
      logger.error("Request failed", error, { errorId });
      return {
        status: error.status,
        body: { error: error.publicMessage, code: error.code, errorId },
      };
    }
    return {
      status: error.status,
      body: { error: error.publicMessage, code: error.code },
    };
  }

  if (isPrismaError(error)) {
    return mapPrismaError(error);
  }

  const errorId = newErrorId();
  logger.error("Unhandled request error", error, { errorId });
  return {
    status: 500,
    body: { error: GENERIC_MESSAGE, code: "internal_error", errorId },
  };
}
