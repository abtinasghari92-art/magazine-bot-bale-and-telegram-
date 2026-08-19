import "server-only";

import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/validation";
import { getAppEnvironment } from "@/lib/env";

export function toPublicErrorResponse(error: unknown): {
  status: number;
  body: { error: string };
} {
  if (error instanceof ValidationError) {
    return {
      status: error.status,
      body: { error: error.message },
    };
  }

  logger.error("Unhandled server error", error);

  const expose = getAppEnvironment() !== "production";
  return {
    status: 500,
    body: {
      error: expose && error instanceof Error ? error.message : "Internal server error",
    },
  };
}
