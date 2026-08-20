import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Admin session tokens (REQ-046 / REQ-070).
 *
 * The cookie carries 32 random bytes. The database stores only the SHA-256 of
 * that token, so a database dump does not hand anyone a usable session. SHA-256
 * (not bcrypt) is right here: the token already has full entropy, and the check
 * runs on every admin request.
 */

export const SESSION_COOKIE_NAME = "admin_session";
const TOKEN_BYTES = 32;

export function generateSessionToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time comparison for two hex digests of equal length. */
export function sessionTokenMatches(candidateHash: string, storedHash: string): boolean {
  const a = Buffer.from(candidateHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Hash a client address before it is stored next to a login attempt. */
export function hashClientAddress(address: string | null | undefined): string | null {
  const trimmed = address?.trim();
  if (!trimmed) return null;
  return createHash("sha256").update(trimmed, "utf8").digest("hex").slice(0, 32);
}

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}
