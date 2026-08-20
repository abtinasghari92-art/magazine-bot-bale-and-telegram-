import "server-only";

import { NextResponse } from "next/server";

import { FieldValidationError } from "@/lib/validation";
import { mapErrorToApiResponse, type ApiErrorBody } from "@/server/error-mapping";

export type { ApiErrorBody };

/** Responses to a Mini App WebView are per-user and must never be cached. */
const NO_STORE = { "Cache-Control": "no-store" } as const;

export function jsonOk<T extends object>(body: T, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

/**
 * Map any thrown value to a safe response. Internal messages, stack traces and
 * Prisma details never cross this boundary — see `server/error-mapping.ts`.
 */
export function jsonError(error: unknown): NextResponse<ApiErrorBody> {
  const { status, body } = mapErrorToApiResponse(error);
  return NextResponse.json(body, { status, headers: NO_STORE });
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
