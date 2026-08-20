import "server-only";

import type { PrismaClient } from "@prisma/client";

import type { AdminRepository } from "@/modules/admin";
import type { AdminSessionRecord, AdminUserRecord } from "@/modules/admin";
import { normalizeAdminEmail } from "@/modules/admin";

type PrismaAdminUser = {
  id: string;
  email: string;
  name: string | null;
  passwordHash: string | null;
  status: "ACTIVE" | "DISABLED";
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaAdminSession = {
  id: string;
  adminUserId: string;
  tokenHash: string;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
};

function toAdmin(row: PrismaAdminUser): AdminUserRecord {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    passwordHash: row.passwordHash,
    status: row.status,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSession(row: PrismaAdminSession): AdminSessionRecord {
  return {
    id: row.id,
    adminUserId: row.adminUserId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    lastUsedAt: row.lastUsedAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
  };
}

/** PostgreSQL implementation of the admin authentication port (REQ-046). */
export class PrismaAdminRepository implements AdminRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<AdminUserRecord | null> {
    const row = await this.prisma.adminUser.findUnique({
      where: { email: normalizeAdminEmail(email) },
    });
    return row ? toAdmin(row) : null;
  }

  async findById(adminUserId: string): Promise<AdminUserRecord | null> {
    const row = await this.prisma.adminUser.findUnique({ where: { id: adminUserId } });
    return row ? toAdmin(row) : null;
  }

  async markLoggedIn(adminUserId: string, at: Date): Promise<void> {
    await this.prisma.adminUser.update({
      where: { id: adminUserId },
      data: { lastLoginAt: at },
    });
  }

  async createSession(input: {
    adminUserId: string;
    tokenHash: string;
    expiresAt: Date;
    ipHash?: string | null;
    userAgent?: string | null;
  }): Promise<AdminSessionRecord> {
    const row = await this.prisma.adminSession.create({
      data: {
        adminUserId: input.adminUserId,
        tokenHash: input.tokenHash,
        expiresAt: input.expiresAt,
        ipHash: input.ipHash ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
    return toSession(row);
  }

  async findSessionByTokenHash(tokenHash: string): Promise<AdminSessionRecord | null> {
    const row = await this.prisma.adminSession.findUnique({ where: { tokenHash } });
    return row ? toSession(row) : null;
  }

  async touchSession(sessionId: string, at: Date): Promise<void> {
    await this.prisma.adminSession.update({
      where: { id: sessionId },
      data: { lastUsedAt: at },
    });
  }

  async revokeSession(sessionId: string, at: Date): Promise<void> {
    await this.prisma.adminSession.update({
      where: { id: sessionId },
      data: { revokedAt: at },
    });
  }

  async deleteExpiredSessions(before: Date): Promise<number> {
    const result = await this.prisma.adminSession.deleteMany({
      where: { expiresAt: { lt: before } },
    });
    return result.count;
  }

  async recordLoginAttempt(input: {
    email: string;
    ipHash?: string | null;
    successful: boolean;
  }): Promise<void> {
    await this.prisma.adminLoginAttempt.create({
      data: {
        email: normalizeAdminEmail(input.email),
        ipHash: input.ipHash ?? null,
        successful: input.successful,
      },
    });
  }

  /**
   * Failures in the window for this email, or from this address against any
   * email — so spraying many accounts from one client is throttled too.
   */
  async countRecentFailures(input: {
    email: string;
    ipHash?: string | null;
    since: Date;
  }): Promise<number> {
    const email = normalizeAdminEmail(input.email);
    const or: { email?: string; ipHash?: string }[] = [{ email }];
    if (input.ipHash) or.push({ ipHash: input.ipHash });

    return this.prisma.adminLoginAttempt.count({
      where: {
        successful: false,
        createdAt: { gte: input.since },
        OR: or,
      },
    });
  }
}
