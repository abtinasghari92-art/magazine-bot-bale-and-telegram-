import bcrypt from "bcryptjs";

import { normalizeAdminEmail } from "@/modules/admin";
import type { AdminRepository } from "@/modules/admin";
import type { AdminSessionRecord, AdminStatus, AdminUserRecord } from "@/modules/admin";

/**
 * In-memory `AdminRepository` for the authentication tests.
 *
 * Fixtures are seeded at a deliberately low bcrypt cost. bcrypt stores the cost
 * inside the hash, so `verifyPassword` still exercises the real comparison —
 * it just does not spend ~700ms per call the way the production cost of 12
 * does in pure JavaScript. `tests/admin-bootstrap.test.ts` asserts the
 * production cost separately.
 */
const FIXTURE_BCRYPT_COST = 4;

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

type Attempt = { email: string; ipHash: string | null; successful: boolean; at: Date };

export class FakeAdminRepository implements AdminRepository {
  readonly admins = new Map<string, AdminUserRecord>();
  readonly sessions = new Map<string, AdminSessionRecord>();
  readonly attempts: Attempt[] = [];

  /** Seed an admin with a real bcrypt hash, as the bootstrap command would. */
  async seedAdmin(input: {
    email: string;
    password: string;
    status?: AdminStatus;
    name?: string | null;
  }): Promise<AdminUserRecord> {
    const now = new Date();
    const admin: AdminUserRecord = {
      id: nextId("admin"),
      email: normalizeAdminEmail(input.email),
      name: input.name ?? null,
      passwordHash: await bcrypt.hash(input.password, FIXTURE_BCRYPT_COST),
      status: input.status ?? "ACTIVE",
      lastLoginAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.admins.set(admin.id, admin);
    return admin;
  }

  async findByEmail(email: string): Promise<AdminUserRecord | null> {
    const normalized = normalizeAdminEmail(email);
    for (const admin of this.admins.values()) {
      if (admin.email === normalized) return { ...admin };
    }
    return null;
  }

  async findById(adminUserId: string): Promise<AdminUserRecord | null> {
    const admin = this.admins.get(adminUserId);
    return admin ? { ...admin } : null;
  }

  async markLoggedIn(adminUserId: string, at: Date): Promise<void> {
    const admin = this.admins.get(adminUserId);
    if (admin) this.admins.set(adminUserId, { ...admin, lastLoginAt: at });
  }

  async createSession(input: {
    adminUserId: string;
    tokenHash: string;
    expiresAt: Date;
    ipHash?: string | null;
    userAgent?: string | null;
  }): Promise<AdminSessionRecord> {
    const now = new Date();
    const session: AdminSessionRecord = {
      id: nextId("session"),
      adminUserId: input.adminUserId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      lastUsedAt: now,
      revokedAt: null,
      createdAt: now,
    };
    this.sessions.set(session.id, session);
    return { ...session };
  }

  async findSessionByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null> {
    for (const session of this.sessions.values()) {
      if (session.tokenHash === tokenHash) return { ...session };
    }
    return null;
  }

  async touchSession(sessionId: string, at: Date): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) this.sessions.set(sessionId, { ...session, lastUsedAt: at });
  }

  async revokeSession(sessionId: string, at: Date): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (session) this.sessions.set(sessionId, { ...session, revokedAt: at });
  }

  async deleteExpiredSessions(before: Date): Promise<number> {
    let removed = 0;
    for (const [id, session] of this.sessions) {
      if (session.expiresAt.getTime() < before.getTime()) {
        this.sessions.delete(id);
        removed += 1;
      }
    }
    return removed;
  }

  async recordLoginAttempt(input: {
    email: string;
    ipHash?: string | null;
    successful: boolean;
  }): Promise<void> {
    this.attempts.push({
      email: normalizeAdminEmail(input.email),
      ipHash: input.ipHash ?? null,
      successful: input.successful,
      at: new Date(),
    });
  }

  async countRecentFailures(input: {
    email: string;
    ipHash?: string | null;
    since: Date;
  }): Promise<number> {
    const email = normalizeAdminEmail(input.email);
    return this.attempts.filter(
      (attempt) =>
        !attempt.successful &&
        attempt.at.getTime() >= input.since.getTime() &&
        (attempt.email === email ||
          (input.ipHash != null && attempt.ipHash === input.ipHash)),
    ).length;
  }
}
