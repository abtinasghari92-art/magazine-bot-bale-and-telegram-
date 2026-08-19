import "server-only";

import { z } from "zod";

const appEnvSchema = z.enum(["development", "test", "staging", "production"]);

const optionalSecret = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const appUrlSchema = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  })
  .refine((value) => value === undefined || z.string().url().safeParse(value).success, {
    message: "APP_URL must be a valid URL",
  });

function booleanFlag(defaultValue: boolean) {
  return z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim().toLowerCase();
      if (!trimmed) return defaultValue;
      return trimmed === "1" || trimmed === "true" || trimmed === "yes";
    });
}

function positiveInt(defaultValue: number, max: number) {
  return z
    .string()
    .optional()
    .transform((value) => {
      const trimmed = value?.trim();
      if (!trimmed) return defaultValue;
      const parsed = Number.parseInt(trimmed, 10);
      return Number.isFinite(parsed) ? parsed : Number.NaN;
    })
    .refine((value) => Number.isInteger(value) && value > 0 && value <= max, {
      message: `must be an integer between 1 and ${max}`,
    });
}

/// `none` refuses to send and is the conservative production default until DEC-003 names a vendor.
const phoneVerificationProviderSchema = z.preprocess((value) => {
  const trimmed = typeof value === "string" ? value.trim().toLowerCase() : value;
  return trimmed === "" || trimmed === undefined ? undefined : trimmed;
}, z.enum(["none", "log"]).optional());

const schema = z.object({
  APP_ENV: appEnvSchema.optional().default("development"),
  APP_URL: appUrlSchema,
  DATABASE_URL: optionalSecret,
  TELEGRAM_BOT_TOKEN: optionalSecret,
  TELEGRAM_WEBAPP_SECRET: optionalSecret,
  TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: positiveInt(86_400, 604_800),
  TELEGRAM_DEV_AUTH_ENABLED: booleanFlag(false),
  OTP_REQUIRED: booleanFlag(false),
  PHONE_VERIFICATION_PROVIDER: phoneVerificationProviderSchema,
  OTP_CODE_LENGTH: positiveInt(6, 10),
  OTP_CODE_TTL_SECONDS: positiveInt(180, 3_600),
  OTP_MAX_ATTEMPTS: positiveInt(5, 20),
  OTP_RESEND_INTERVAL_SECONDS: positiveInt(60, 3_600),
  BALE_BOT_TOKEN: optionalSecret,
  OBJECT_STORAGE_ENDPOINT: optionalSecret,
  OBJECT_STORAGE_REGION: optionalSecret,
  OBJECT_STORAGE_BUCKET: optionalSecret,
  OBJECT_STORAGE_ACCESS_KEY: optionalSecret,
  OBJECT_STORAGE_SECRET_KEY: optionalSecret,
});

export type ServerEnv = z.infer<typeof schema>;

function readRawEnv(): Record<string, string | undefined> {
  return {
    APP_ENV: process.env.APP_ENV,
    APP_URL: process.env.APP_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
    TELEGRAM_WEBAPP_SECRET: process.env.TELEGRAM_WEBAPP_SECRET,
    TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: process.env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS,
    TELEGRAM_DEV_AUTH_ENABLED: process.env.TELEGRAM_DEV_AUTH_ENABLED,
    OTP_REQUIRED: process.env.OTP_REQUIRED,
    PHONE_VERIFICATION_PROVIDER: process.env.PHONE_VERIFICATION_PROVIDER,
    OTP_CODE_LENGTH: process.env.OTP_CODE_LENGTH,
    OTP_CODE_TTL_SECONDS: process.env.OTP_CODE_TTL_SECONDS,
    OTP_MAX_ATTEMPTS: process.env.OTP_MAX_ATTEMPTS,
    OTP_RESEND_INTERVAL_SECONDS: process.env.OTP_RESEND_INTERVAL_SECONDS,
    BALE_BOT_TOKEN: process.env.BALE_BOT_TOKEN,
    OBJECT_STORAGE_ENDPOINT: process.env.OBJECT_STORAGE_ENDPOINT,
    OBJECT_STORAGE_REGION: process.env.OBJECT_STORAGE_REGION,
    OBJECT_STORAGE_BUCKET: process.env.OBJECT_STORAGE_BUCKET,
    OBJECT_STORAGE_ACCESS_KEY: process.env.OBJECT_STORAGE_ACCESS_KEY,
    OBJECT_STORAGE_SECRET_KEY: process.env.OBJECT_STORAGE_SECRET_KEY,
  };
}

function assertProductionSecrets(env: ServerEnv): void {
  const missing: string[] = [];
  if (!env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!env.APP_URL) missing.push("APP_URL");
  if (missing.length > 0) {
    throw new Error(
      `Missing required production environment variables: ${missing.join(", ")}`,
    );
  }
}

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = schema.safeParse(readRawEnv());
  if (!parsed.success) {
    const fields = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid environment variables: ${fields || "unknown"}`);
  }

  const env = parsed.data;
  if (env.APP_ENV === "production") {
    assertProductionSecrets(env);
  }

  cached = env;
  return env;
}

export function getAppEnvironment(): ServerEnv["APP_ENV"] {
  const parsed = appEnvSchema.safeParse(process.env.APP_ENV);
  return parsed.success ? parsed.data : "development";
}

export function isNonProductionEnvironment(): boolean {
  const appEnv = getAppEnvironment();
  return appEnv === "development" || appEnv === "test";
}

/**
 * Telegram init-data verification settings (REQ-005 / REQ-070).
 * The bot token stays server-side; nothing here may be exposed to the browser.
 */
export function getTelegramConfig(): {
  botToken?: string;
  maxAgeSeconds: number;
  devAuthEnabled: boolean;
} {
  const env = getServerEnv();
  return {
    botToken: env.TELEGRAM_BOT_TOKEN,
    maxAgeSeconds: env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS,
    // A signature bypass is only ever honoured outside production/staging.
    devAuthEnabled: env.TELEGRAM_DEV_AUTH_ENABLED && isNonProductionEnvironment(),
  };
}

/**
 * Mobile-verification settings (REQ-018). DEC-011 has not been signed, so the
 * requirement flag defaults to off and the provider defaults to `none`
 * (refuses to send) anywhere that is not development/test.
 */
export function getPhoneVerificationConfig(): {
  required: boolean;
  provider: "none" | "log";
  codeLength: number;
  ttlSeconds: number;
  maxAttempts: number;
  resendIntervalSeconds: number;
} {
  const env = getServerEnv();
  const fallbackProvider = isNonProductionEnvironment() ? "log" : "none";
  return {
    required: env.OTP_REQUIRED,
    provider: env.PHONE_VERIFICATION_PROVIDER ?? fallbackProvider,
    codeLength: env.OTP_CODE_LENGTH,
    ttlSeconds: env.OTP_CODE_TTL_SECONDS,
    maxAttempts: env.OTP_MAX_ATTEMPTS,
    resendIntervalSeconds: env.OTP_RESEND_INTERVAL_SECONDS,
  };
}
