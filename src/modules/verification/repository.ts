import type { PhoneVerificationRecord, PhoneVerificationStatus } from "./types";

/** Persistence port for mobile-verification attempts (REQ-018). */
export interface PhoneVerificationRepository {
  findLatestPending(
    userId: string,
    phone: string,
  ): Promise<PhoneVerificationRecord | null>;

  create(input: {
    userId: string;
    phone: string;
    codeHash: string;
    provider: string;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<PhoneVerificationRecord>;

  /** Close every open attempt for this user/phone pair. */
  expirePending(userId: string, phone: string, at: Date): Promise<void>;

  recordAttempt(
    verificationId: string,
    input: { attempts: number; status: PhoneVerificationStatus; consumedAt: Date | null },
  ): Promise<PhoneVerificationRecord>;

  markUserPhoneVerified(userId: string, phone: string, verifiedAt: Date): Promise<void>;
}
