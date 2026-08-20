import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getObjectStorageConfig, resetServerEnvForTests } from "@/lib/env";
import { getObjectStorage, resetObjectStorageForTests } from "@/server/storage";

/**
 * Which Object Storage adapter each environment gets (REQ-014 foundation).
 *
 * The rule that matters: staging and production without credentials must land
 * on the adapter that **refuses** writes. Falling back to a local folder there
 * would put a magazine cover on a container disk that the next deploy erases,
 * and the failure would only surface later, as a broken image.
 */

const KEYS = [
  "APP_ENV",
  "DATABASE_URL",
  "APP_URL",
  "OBJECT_STORAGE_PROVIDER",
  "OBJECT_STORAGE_ENDPOINT",
  "OBJECT_STORAGE_REGION",
  "OBJECT_STORAGE_BUCKET",
  "OBJECT_STORAGE_ACCESS_KEY",
  "OBJECT_STORAGE_SECRET_KEY",
] as const;

let saved: Record<string, string | undefined> = {};

/**
 * `staging` and `production` refuse to boot without their required secrets, so
 * every case supplies placeholders; the assertions are about storage, not that
 * guard.
 */
const REQUIRED_FOR_NON_DEV = {
  DATABASE_URL: "postgresql://user:pass@db.example.com:5432/magazine",
  APP_URL: "https://example.com",
};

function setEnv(values: Record<string, string | undefined>): void {
  for (const key of KEYS) delete process.env[key];
  const merged = { ...REQUIRED_FOR_NON_DEV, ...values };
  for (const [key, value] of Object.entries(merged)) {
    if (value !== undefined) process.env[key] = value;
  }
  resetServerEnvForTests();
  resetObjectStorageForTests();
}

const CREDENTIALS = {
  OBJECT_STORAGE_ENDPOINT: "https://storage.example.com",
  OBJECT_STORAGE_REGION: "us-east-1",
  OBJECT_STORAGE_BUCKET: "magazine",
  OBJECT_STORAGE_ACCESS_KEY: "AKIAEXAMPLE",
  OBJECT_STORAGE_SECRET_KEY: "secret-example",
};

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
});

afterEach(() => {
  for (const key of KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(saved)) {
    if (value !== undefined) process.env[key] = value;
  }
  resetServerEnvForTests();
  resetObjectStorageForTests();
});

describe("object storage provider resolution", () => {
  it("uses the S3 adapter whenever full credentials exist", () => {
    for (const appEnv of ["development", "staging", "production"]) {
      setEnv({ APP_ENV: appEnv, ...CREDENTIALS });
      expect(getObjectStorageConfig().provider).toBe("s3");
      expect(getObjectStorage().provider).toBe("s3");
      expect(getObjectStorage().canWrite).toBe(true);
    }
  });

  it("uses the local development adapter in development without credentials", () => {
    setEnv({ APP_ENV: "development" });
    expect(getObjectStorage().provider).toBe("local");
    expect(getObjectStorage().canWrite).toBe(true);
  });

  it("REFUSES writes in staging and production without credentials", () => {
    for (const appEnv of ["staging", "production"]) {
      setEnv({ APP_ENV: appEnv });
      const storage = getObjectStorage();
      expect(storage.provider).toBe("none");
      expect(storage.canWrite).toBe(false);
    }
  });

  it("refuses partial credentials rather than half-configuring S3", () => {
    setEnv({
      APP_ENV: "production",
      OBJECT_STORAGE_PROVIDER: "s3",
      OBJECT_STORAGE_ENDPOINT: CREDENTIALS.OBJECT_STORAGE_ENDPOINT,
      // bucket, key and secret deliberately missing
    });

    const storage = getObjectStorage();
    expect(storage.canWrite).toBe(false);
    expect(storage.provider).toBe("none");
  });

  it("never honours an explicit local provider outside development or test", () => {
    for (const appEnv of ["staging", "production"]) {
      // Even a deliberate misconfiguration must not write to container disk.
      setEnv({ APP_ENV: appEnv, OBJECT_STORAGE_PROVIDER: "local" });
      expect(getObjectStorage().canWrite).toBe(false);
    }
  });

  it("honours an explicit local provider in development", () => {
    setEnv({ APP_ENV: "development", OBJECT_STORAGE_PROVIDER: "local" });
    expect(getObjectStorage().provider).toBe("local");
  });

  it("honours an explicit `none` even when credentials are present", () => {
    setEnv({ APP_ENV: "development", OBJECT_STORAGE_PROVIDER: "none", ...CREDENTIALS });
    expect(getObjectStorage().canWrite).toBe(false);
  });
});
