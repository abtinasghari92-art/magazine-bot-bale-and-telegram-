import type { AdminSessionRecord, AdminUserRecord } from "./types";

/**
 * Persistence port for admin authentication (REQ-046).
 *
 * There is deliberately no `createAdmin` on this port: accounts are created by
 * the documented bootstrap command, never by an HTTP route, so the application
 * has no self-registration path at all.
 */
export interface AdminRepository {
  findByEmail(email: string): Promise<AdminUserRecord | null>;

  findById(adminUserId: string): Promise<AdminUserRecord | null>;

  markLoggedIn(adminUserId: string, at: Date): Promise<void>;

  createSession(input: {
    adminUserId: string;
    tokenHash: string;
    expiresAt: Date;
    ipHash?: string | null;
    userAgent?: string | null;
  }): Promise<AdminSessionRecord>;

  findSessionByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null>;

  touchSession(sessionId: string, at: Date): Promise<void>;

  revokeSession(sessionId: string, at: Date): Promise<void>;

  /** Housekeeping for expired/revoked rows. */
  deleteExpiredSessions(before: Date): Promise<number>;

  recordLoginAttempt(input: {
    email: string;
    ipHash?: string | null;
    successful: boolean;
  }): Promise<void>;

  countRecentFailures(input: {
    email: string;
    ipHash?: string | null;
    since: Date;
  }): Promise<number>;
}
