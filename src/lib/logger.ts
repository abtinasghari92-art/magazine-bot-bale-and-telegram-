const SECRET_PATTERN =
  /token|secret|password|authorization|api[_-]?key|database_url|access[_-]?key|private[_-]?key|credential/i;

function redactValue(key: string, value: unknown): unknown {
  if (SECRET_PATTERN.test(key)) {
    return "[redacted]";
  }
  if (typeof value === "string" && SECRET_PATTERN.test(value)) {
    return "[redacted]";
  }
  return value;
}

function serializeUnknown(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "unknown error";
}

export const logger = {
  info(message: string, context?: Record<string, unknown>): void {
    console.info(message, sanitizeContext(context));
  },
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(message, sanitizeContext(context));
  },
  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    console.error(message, {
      ...sanitizeContext(context),
      error: serializeUnknown(error),
    });
  },
};

export function sanitizeContext(
  context?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    sanitized[key] = redactValue(key, value);
  }
  return sanitized;
}
