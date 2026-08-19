import { RateLimitedError, ServiceUnavailableError } from "@/lib/errors";
import { normalizeIranianMobile } from "@/lib/phone";
import { FieldValidationError } from "@/lib/validation";

import { generateNumericCode, hashVerificationCode, verifyVerificationCode } from "./code";
import type { PhoneVerificationProvider } from "./provider";
import type { PhoneVerificationRepository } from "./repository";
import type { PhoneVerificationConfig } from "./types";

export type PhoneVerificationDeps = {
  repository: PhoneVerificationRepository;
  provider: PhoneVerificationProvider;
  config: PhoneVerificationConfig;
};

export type VerificationRequestResult = {
  provider: string;
  expiresAt: Date;
  resendAvailableAt: Date;
  codeLength: number;
};

function requireMobile(input: string): string {
  const phone = normalizeIranianMobile(input);
  if (!phone) {
    throw new FieldValidationError([
      { field: "phone", message: "شماره موبایل معتبر نیست. نمونه درست: 09121234567" },
    ]);
  }
  return phone;
}

/** Start a verification: issue a code, store only its hash, hand it to the provider. */
export async function requestPhoneVerification(
  deps: PhoneVerificationDeps,
  userId: string,
  rawPhone: string,
  now: Date = new Date(),
): Promise<VerificationRequestResult> {
  const phone = requireMobile(rawPhone);

  if (!deps.provider.canSend) {
    throw new ServiceUnavailableError(
      "ارسال کد تأیید در این محیط فعال نیست.",
      `provider ${deps.provider.name} cannot send`,
    );
  }

  const pending = await deps.repository.findLatestPending(userId, phone);
  if (pending) {
    const nextAllowed = new Date(
      pending.createdAt.getTime() + deps.config.resendIntervalSeconds * 1000,
    );
    if (nextAllowed > now && pending.expiresAt > now) {
      const waitSeconds = Math.ceil((nextAllowed.getTime() - now.getTime()) / 1000);
      throw new RateLimitedError(
        `برای ارسال دوباره ${waitSeconds} ثانیه صبر کنید.`,
        `resend blocked for ${waitSeconds}s`,
      );
    }
  }

  await deps.repository.expirePending(userId, phone, now);

  const code = generateNumericCode(deps.config.codeLength);
  const expiresAt = new Date(now.getTime() + deps.config.ttlSeconds * 1000);

  await deps.repository.create({
    userId,
    phone,
    codeHash: hashVerificationCode(code),
    provider: deps.provider.name,
    expiresAt,
    createdAt: now,
  });

  await deps.provider.send({ phone, code, expiresAt });

  return {
    provider: deps.provider.name,
    expiresAt,
    resendAvailableAt: new Date(now.getTime() + deps.config.resendIntervalSeconds * 1000),
    codeLength: deps.config.codeLength,
  };
}

export type VerificationConfirmResult = {
  phone: string;
  verifiedAt: Date;
};

/** Confirm a code. On success the number becomes the user's verified mobile. */
export async function confirmPhoneVerification(
  deps: PhoneVerificationDeps,
  userId: string,
  rawPhone: string,
  rawCode: string,
  now: Date = new Date(),
): Promise<VerificationConfirmResult> {
  const phone = requireMobile(rawPhone);
  const code = rawCode.trim();

  const pending = await deps.repository.findLatestPending(userId, phone);
  if (!pending) {
    throw new FieldValidationError([
      { field: "code", message: "کد فعالی برای این شماره وجود ندارد. دوباره درخواست دهید." },
    ]);
  }

  if (pending.expiresAt <= now) {
    await deps.repository.recordAttempt(pending.id, {
      attempts: pending.attempts,
      status: "EXPIRED",
      consumedAt: now,
    });
    throw new FieldValidationError([
      { field: "code", message: "کد تأیید منقضی شده است. دوباره درخواست دهید." },
    ]);
  }

  const attempts = pending.attempts + 1;

  if (!verifyVerificationCode(pending.codeHash, code)) {
    const exhausted = attempts >= deps.config.maxAttempts;
    await deps.repository.recordAttempt(pending.id, {
      attempts,
      status: exhausted ? "FAILED" : "PENDING",
      consumedAt: exhausted ? now : null,
    });
    throw new FieldValidationError([
      {
        field: "code",
        message: exhausted
          ? "تعداد تلاش‌ها بیش از حد مجاز است. دوباره درخواست دهید."
          : "کد تأیید نادرست است.",
      },
    ]);
  }

  await deps.repository.recordAttempt(pending.id, {
    attempts,
    status: "VERIFIED",
    consumedAt: now,
  });
  await deps.repository.markUserPhoneVerified(userId, phone, now);

  return { phone, verifiedAt: now };
}
