import "server-only";

import type { PhoneVerificationRepository } from "@/modules/verification/repository";
import type {
  PhoneVerificationRecord,
  PhoneVerificationStatus,
} from "@/modules/verification/types";

import type { PrismaLike } from "./types";

type VerificationRow = {
  id: string;
  userId: string;
  phone: string;
  codeHash: string;
  provider: string;
  status: PhoneVerificationStatus;
  attempts: number;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
};

function toRecord(row: VerificationRow): PhoneVerificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    phone: row.phone,
    codeHash: row.codeHash,
    provider: row.provider,
    status: row.status,
    attempts: row.attempts,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    createdAt: row.createdAt,
  };
}

export class PrismaPhoneVerificationRepository implements PhoneVerificationRepository {
  constructor(private readonly db: PrismaLike) {}

  async findLatestPending(
    userId: string,
    phone: string,
  ): Promise<PhoneVerificationRecord | null> {
    const row = await this.db.phoneVerification.findFirst({
      where: { userId, phone, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
    return row ? toRecord(row) : null;
  }

  async create(input: {
    userId: string;
    phone: string;
    codeHash: string;
    provider: string;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<PhoneVerificationRecord> {
    const row = await this.db.phoneVerification.create({ data: input });
    return toRecord(row);
  }

  async expirePending(userId: string, phone: string, at: Date): Promise<void> {
    await this.db.phoneVerification.updateMany({
      where: { userId, phone, status: "PENDING" },
      data: { status: "EXPIRED", consumedAt: at },
    });
  }

  async recordAttempt(
    verificationId: string,
    input: {
      attempts: number;
      status: PhoneVerificationStatus;
      consumedAt: Date | null;
    },
  ): Promise<PhoneVerificationRecord> {
    const row = await this.db.phoneVerification.update({
      where: { id: verificationId },
      data: {
        attempts: input.attempts,
        status: input.status,
        consumedAt: input.consumedAt,
      },
    });
    return toRecord(row);
  }

  async markUserPhoneVerified(
    userId: string,
    phone: string,
    verifiedAt: Date,
  ): Promise<void> {
    await this.db.user.update({
      where: { id: userId },
      data: { phone, phoneVerifiedAt: verifiedAt },
    });
  }
}
