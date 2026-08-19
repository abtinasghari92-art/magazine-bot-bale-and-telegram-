import "server-only";

import { getAppEnvironment, getPhoneVerificationConfig } from "@/lib/env";
import { createPhoneVerificationProvider } from "@/modules/verification";
import type { PhoneVerificationDeps } from "@/modules/verification";
import { getPrisma } from "@/server/db";
import { PrismaPhoneVerificationRepository } from "@/server/repositories/phone-verification-repository";

/** Build the mobile-verification dependencies for the current environment. */
export function getPhoneVerificationDeps(): PhoneVerificationDeps {
  const config = getPhoneVerificationConfig();
  return {
    repository: new PrismaPhoneVerificationRepository(getPrisma()),
    provider: createPhoneVerificationProvider(config.provider, getAppEnvironment()),
    config: {
      required: config.required,
      codeLength: config.codeLength,
      ttlSeconds: config.ttlSeconds,
      maxAttempts: config.maxAttempts,
      resendIntervalSeconds: config.resendIntervalSeconds,
    },
  };
}

export function isPhoneVerificationRequired(): boolean {
  return getPhoneVerificationConfig().required;
}
