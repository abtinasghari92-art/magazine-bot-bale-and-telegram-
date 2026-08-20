import "server-only";

import path from "node:path";

import { getObjectStorageConfig, isNonProductionEnvironment } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  LocalObjectStorage,
  S3ObjectStorage,
  UnavailableObjectStorage,
  type ObjectStorage,
} from "@/modules/storage";

/** Git-ignored folder used only by the development adapter. */
export const LOCAL_STORAGE_DIRECTORY = path.join(process.cwd(), ".data", "object-storage");

let cached: ObjectStorage | undefined;

/**
 * Resolve the Object Storage adapter for this environment (REQ-014 foundation).
 *
 * - real credentials → S3-compatible adapter (Liara Object Storage or similar);
 * - development/test without credentials → local folder adapter;
 * - staging/production without credentials → refuse writes.
 *
 * The last case is deliberate: a production upload must fail visibly rather
 * than land on a container disk that the next deploy throws away.
 */
export function getObjectStorage(): ObjectStorage {
  if (cached) return cached;

  const config = getObjectStorageConfig();

  if (config.provider === "s3") {
    if (
      !config.endpoint ||
      !config.bucket ||
      !config.accessKey ||
      !config.secretKey
    ) {
      logger.error(
        "OBJECT_STORAGE_PROVIDER=s3 but credentials are incomplete; uploads are disabled",
        undefined,
        { hasEndpoint: Boolean(config.endpoint), hasBucket: Boolean(config.bucket) },
      );
      cached = new UnavailableObjectStorage();
      return cached;
    }
    cached = new S3ObjectStorage({
      endpoint: config.endpoint,
      region: config.region,
      bucket: config.bucket,
      accessKey: config.accessKey,
      secretKey: config.secretKey,
      forcePathStyle: config.forcePathStyle,
    });
    return cached;
  }

  if (config.provider === "local") {
    if (!isNonProductionEnvironment()) {
      logger.error(
        "OBJECT_STORAGE_PROVIDER=local is refused outside development/test",
        undefined,
      );
      cached = new UnavailableObjectStorage();
      return cached;
    }
    cached = new LocalObjectStorage(LOCAL_STORAGE_DIRECTORY);
    return cached;
  }

  cached = new UnavailableObjectStorage();
  return cached;
}

/** Reset the memoized adapter. Tests only. */
export function resetObjectStorageForTests(): void {
  cached = undefined;
}
