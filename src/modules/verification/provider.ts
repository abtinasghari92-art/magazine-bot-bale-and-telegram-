import { ServiceUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { maskMobile } from "@/lib/phone";

export type PhoneVerificationMessage = {
  phone: string;
  code: string;
  expiresAt: Date;
};

/**
 * Delivery port for mobile verification codes (REQ-018).
 *
 * No SMS vendor has been selected yet (DEC-003), so the only implementations
 * here are a development/staging log sink and a provider that refuses to send.
 * A real vendor (Kavenegar or otherwise) becomes another implementation of this
 * interface on Day 8 — nothing else in the flow changes.
 */
export interface PhoneVerificationProvider {
  readonly name: string;
  /** False when the provider cannot actually deliver a message. */
  readonly canSend: boolean;
  send(message: PhoneVerificationMessage): Promise<void>;
}

/**
 * Development/testing sender. Writes the code to the server log and nothing
 * else. `createPhoneVerificationProvider` refuses to build this in production.
 */
export class LogPhoneVerificationProvider implements PhoneVerificationProvider {
  readonly name = "log";
  readonly canSend = true;

  constructor(
    private readonly sink: (message: PhoneVerificationMessage) => void = (message) => {
      logger.warn("[dev] phone verification code issued", {
        phone: maskMobile(message.phone),
        code: message.code,
        expiresAt: message.expiresAt.toISOString(),
      });
    },
  ) {}

  async send(message: PhoneVerificationMessage): Promise<void> {
    this.sink(message);
  }
}

/** Conservative default: no vendor configured, so nothing is sent. */
export class UnconfiguredPhoneVerificationProvider implements PhoneVerificationProvider {
  readonly name = "none";
  readonly canSend = false;

  async send(): Promise<never> {
    throw new ServiceUnavailableError(
      "سرویس پیامک هنوز پیکربندی نشده است.",
      "no SMS provider is configured (DEC-003)",
    );
  }
}

export function createPhoneVerificationProvider(
  provider: "none" | "log",
  appEnv: "development" | "test" | "staging" | "production",
): PhoneVerificationProvider {
  if (provider === "log") {
    if (appEnv === "production") {
      throw new Error(
        "PHONE_VERIFICATION_PROVIDER=log is not allowed in production; codes must not be logged",
      );
    }
    return new LogPhoneVerificationProvider();
  }
  return new UnconfiguredPhoneVerificationProvider();
}
