import "server-only";

import { mapErrorToApiResponse } from "@/server/error-mapping";

/**
 * Legacy helper kept for non-`NextResponse` callers. It shares one mapping with
 * `jsonError`, so neither path can start leaking internals independently.
 */
export function toPublicErrorResponse(error: unknown): {
  status: number;
  body: { error: string; code: string };
} {
  const { status, body } = mapErrorToApiResponse(error);
  return { status, body: { error: body.error, code: body.code } };
}
