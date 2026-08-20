const SECRET_PATTERN =
  /token|secret|password|authorization|api[_-]?key|database_url|access[_-]?key|private[_-]?key|credential/i;

/** `scheme://user:password@host` — Prisma puts the whole DSN in some messages. */
const URL_CREDENTIALS_PATTERN = /([a-z][a-z0-9+.-]*:\/\/)([^\s/@:]+):([^\s/@]*)@/gi;

function redactValue(key: string, value: unknown): unknown {
  if (SECRET_PATTERN.test(key)) {
    return "[redacted]";
  }
  if (typeof value === "string") {
    if (SECRET_PATTERN.test(value)) return "[redacted]";
    return redactSecretsInText(value);
  }
  return value;
}

/**
 * Strip embedded credentials from free text before it reaches the log stream.
 * Server logs are allowed to carry internal detail (REQ-072 keeps secrets out).
 */
export function redactSecretsInText(text: string): string {
  return text.replace(URL_CREDENTIALS_PATTERN, "$1$2:[redacted]@");
}

function serializeUnknown(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: redactSecretsInText(error.message),
      stack: error.stack ? redactSecretsInText(error.stack) : undefined,
      cause:
        error.cause instanceof Error
          ? redactSecretsInText(`${error.cause.name}: ${error.cause.message}`)
          : undefined,
    };
  }
  return { name: "unknown", message: "unknown error" };
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
