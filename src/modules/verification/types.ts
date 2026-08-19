export type PhoneVerificationStatus = "PENDING" | "VERIFIED" | "EXPIRED" | "FAILED";

export type PhoneVerificationRecord = {
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

export type PhoneVerificationConfig = {
  required: boolean;
  codeLength: number;
  ttlSeconds: number;
  maxAttempts: number;
  resendIntervalSeconds: number;
};
