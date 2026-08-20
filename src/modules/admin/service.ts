import { AdminUnauthorizedError, AppError, RateLimitedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { parseWithSchema } from "@/lib/validation";

import { verifyPassword } from "./password";
import type { AdminRepository } from "./repository";
import { adminLoginSchema } from "./schema";
import {
  generateSessionToken,
  hashSessionToken,
  normalizeAdminEmail,
  sessionTokenMatches,
} from "./session";
import type {
  AdminAuthConfig,
  AuthenticatedAdmin,
  LoginContext,
  LoginResult,
} from "./types";

/**
 * Admin authentication (REQ-046 / REQ-070).
 *
 * Scope note: this is the minimum shell needed to operate REQ-048 safely on
 * Day 3 — login, session, logout, brute-force throttling. Roles, permissions
 * and staff management are REQ-067 / REQ-047 on Day 7 and are not here.
 */

/** One message for every failure mode, so login never confirms an email exists. */
const INVALID_CREDENTIALS = "ایمیل یا رمز عبور درست نیست.";

class InvalidCredentialsError extends AppError {
  constructor(internalMessage?: string) {
    super("unauthorized", INVALID_CREDENTIALS, internalMessage);
    this.name = "InvalidCredentialsError";
  }
}

export async function loginAdmin(
  repository: AdminRepository,
  config: AdminAuthConfig,
  input: unknown,
  context: LoginContext = {},
  now: Date = new Date(),
): Promise<LoginResult> {
  const credentials = parseWithSchema(adminLoginSchema, input);
  const email = normalizeAdminEmail(credentials.email);
  const ipHash = context.ipHash ?? null;

  const since = new Date(now.getTime() - config.loginWindowSeconds * 1000);
  const failures = await repository.countRecentFailures({ email, ipHash, since });
  if (failures >= config.maxLoginAttempts) {
    logger.warn("Admin login throttled", { email, failures });
    throw new RateLimitedError(
      "تلاش‌های ناموفق زیاد بوده است. چند دقیقه بعد دوباره تلاش کنید.",
      `admin login throttled for ${email}`,
    );
  }

  const admin = await repository.findByEmail(email);

  // Always run the hash comparison so a missing account and a wrong password
  // take the same time.
  const passwordOk = await verifyPassword(credentials.password, admin?.passwordHash ?? null);
  const accountUsable = Boolean(admin && admin.status === "ACTIVE" && admin.passwordHash);

  if (!admin || !accountUsable || !passwordOk) {
    await repository.recordLoginAttempt({ email, ipHash, successful: false });
    logger.warn("Admin login failed", {
      email,
      reason: !admin ? "unknown-account" : !accountUsable ? "disabled-account" : "bad-password",
    });
    throw new InvalidCredentialsError(`failed admin login for ${email}`);
  }

  const token = generateSessionToken();
  const session = await repository.createSession({
    adminUserId: admin.id,
    tokenHash: hashSessionToken(token),
    expiresAt: new Date(now.getTime() + config.sessionTtlSeconds * 1000),
    ipHash,
    userAgent: context.userAgent?.slice(0, 300) ?? null,
  });

  await repository.recordLoginAttempt({ email, ipHash, successful: true });
  await repository.markLoggedIn(admin.id, now);
  logger.info("Admin login succeeded", { adminUserId: admin.id });

  return { admin, session, token };
}

/**
 * Resolve a session cookie to an admin, or `null`.
 *
 * Returns `null` rather than throwing so a page can redirect to the login form
 * and an API route can answer 401 — both from the same check.
 */
export async function authenticateAdminToken(
  repository: AdminRepository,
  token: string | null | undefined,
  now: Date = new Date(),
): Promise<AuthenticatedAdmin | null> {
  const trimmed = token?.trim();
  if (!trimmed) return null;

  const tokenHash = hashSessionToken(trimmed);
  const session = await repository.findSessionByTokenHash(tokenHash);
  if (!session) return null;

  // The lookup was by hash already; this makes the final decision constant-time.
  if (!sessionTokenMatches(tokenHash, session.tokenHash)) return null;

  if (session.revokedAt !== null || session.expiresAt.getTime() <= now.getTime()) {
    return null;
  }

  const admin = await repository.findById(session.adminUserId);
  if (!admin || admin.status !== "ACTIVE") {
    return null;
  }

  await repository.touchSession(session.id, now);
  return { admin, session };
}

/** Same as `authenticateAdminToken`, but 401s instead of returning `null`. */
export async function requireAdminToken(
  repository: AdminRepository,
  token: string | null | undefined,
  now: Date = new Date(),
): Promise<AuthenticatedAdmin> {
  const authenticated = await authenticateAdminToken(repository, token, now);
  if (!authenticated) {
    throw new AdminUnauthorizedError("admin session missing, expired or revoked");
  }
  return authenticated;
}

export async function logoutAdmin(
  repository: AdminRepository,
  token: string | null | undefined,
  now: Date = new Date(),
): Promise<void> {
  const trimmed = token?.trim();
  if (!trimmed) return;
  const session = await repository.findSessionByTokenHash(hashSessionToken(trimmed));
  if (session && session.revokedAt === null) {
    await repository.revokeSession(session.id, now);
  }
}
