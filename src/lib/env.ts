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

const schema = z.object({
  APP_ENV: appEnvSchema.optional().default("development"),
  APP_URL: appUrlSchema,
  DATABASE_URL: optionalSecret,
  TELEGRAM_BOT_TOKEN: optionalSecret,
  TELEGRAM_WEBAPP_SECRET: optionalSecret,
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
