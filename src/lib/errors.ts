/**
 * Application error types shared by domain modules and route handlers.
 * Every message here is safe to show a user: no stack traces, no internals.
 */
export type AppErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited"
  | "unavailable"
  | "invalid_request";

const DEFAULT_STATUS: Record<AppErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  conflict: 409,
  rate_limited: 429,
  unavailable: 503,
  invalid_request: 400,
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status: number;
  /** Persian text the Mini App may render as-is. */
  readonly publicMessage: string;

  constructor(code: AppErrorCode, publicMessage: string, internalMessage?: string) {
    super(internalMessage ?? publicMessage);
    this.name = "AppError";
    this.code = code;
    this.status = DEFAULT_STATUS[code];
    this.publicMessage = publicMessage;
  }
}

export class UnauthorizedError extends AppError {
  constructor(internalMessage?: string) {
    super("unauthorized", "احراز هویت تلگرام معتبر نیست.", internalMessage);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends AppError {
  constructor(internalMessage?: string) {
    super("forbidden", "به این داده دسترسی ندارید.", internalMessage);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends AppError {
  constructor(publicMessage = "مورد درخواستی یافت نشد.", internalMessage?: string) {
    super("not_found", publicMessage, internalMessage);
    this.name = "NotFoundError";
  }
}

export class ConflictError extends AppError {
  constructor(publicMessage: string, internalMessage?: string) {
    super("conflict", publicMessage, internalMessage);
    this.name = "ConflictError";
  }
}

export class RateLimitedError extends AppError {
  constructor(publicMessage: string, internalMessage?: string) {
    super("rate_limited", publicMessage, internalMessage);
    this.name = "RateLimitedError";
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(publicMessage: string, internalMessage?: string) {
    super("unavailable", publicMessage, internalMessage);
    this.name = "ServiceUnavailableError";
  }
}
