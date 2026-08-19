import "server-only";

import { NextResponse } from "next/server";

import { AppError } from "@/lib/errors";
import { getAppEnvironment } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  FieldValidationError,
  ValidationError,
  toFieldIssues,
  type FieldIssue,
} from "@/lib/validation";

export type ApiErrorBody = {
  error: string;
  code: string;
  issues?: FieldIssue[];
};

/** Responses to a Mini App WebView are per-user and must never be cached. */
const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonOk<T extends object>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/**
 * Map any thrown value to a safe response. Internal messages, stack traces and
 * Prisma details never cross this boundary in production.
 */
export function jsonError(error: unknown): NextResponse<ApiErrorBody> {
  if (error instanceof FieldValidationError) {
    return NextResponse.json(
      { error: "اطلاعات واردشده معتبر نیست.", code: "invalid_request", issues: error.issues },
      { status: error.status, headers: NO_STORE },
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      {
        error: "اطلاعات واردشده معتبر نیست.",
        code: "invalid_request",
        issues: toFieldIssues(error.details),
      },
      { status: error.status, headers: NO_STORE },
    );
  }

  if (error instanceof AppError) {
    if (error.status >= 500) {
      logger.error("Request failed", error);
    }
    return NextResponse.json(
      { error: error.publicMessage, code: error.code },
      { status: error.status, headers: NO_STORE },
    );
  }

  logger.error("Unhandled request error", error);
  const expose = getAppEnvironment() !== "production";
  return NextResponse.json(
    {
      error: expose && error instanceof Error ? error.message : "خطای داخلی سامانه.",
      code: "internal_error",
    },
    { status: 500, headers: NO_STORE },
  );
}

/** Parse a JSON body, returning `{}` for an empty one and rejecting garbage. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new FieldValidationError([
      { field: "_", message: "بدنه درخواست معتبر نیست." },
    ]);
  }
}

export async function handleRoute(
  handler: () => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    return await handler();
  } catch (error) {
    return jsonError(error);
  }
}
