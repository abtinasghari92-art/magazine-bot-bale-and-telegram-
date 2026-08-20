import { NotFoundError, ServiceUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";

import { assertSafeObjectKey } from "./keys";
import type {
  GetObjectResult,
  ObjectStorage,
  PutObjectInput,
  StoredObjectMetadata,
} from "./types";

export type S3ObjectStorageOptions = {
  endpoint: string;
  region?: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  /** Liara Object Storage (and most S3-compatible services) need path style. */
  forcePathStyle: boolean;
};

/**
 * S3-compatible adapter (Liara Object Storage and anything else speaking S3).
 *
 * The AWS SDK is imported lazily so environments without storage credentials —
 * local development, unit tests, the Mini App runtime path that never touches
 * uploads — do not pay for loading it.
 *
 * No public URL is produced here on purpose: REQ-071 (signed, time-limited
 * URLs) is Day 6, and until then every byte is served through an authorized
 * server route.
 */
export class S3ObjectStorage implements ObjectStorage {
  readonly provider = "s3" as const;
  readonly canWrite = true;
  readonly bucket: string;

  private client?: import("@aws-sdk/client-s3").S3Client;

  constructor(private readonly options: S3ObjectStorageOptions) {
    this.bucket = options.bucket;
  }

  private async getClient(): Promise<import("@aws-sdk/client-s3").S3Client> {
    if (!this.client) {
      const { S3Client } = await import("@aws-sdk/client-s3");
      this.client = new S3Client({
        endpoint: this.options.endpoint,
        region: this.options.region ?? "us-east-1",
        forcePathStyle: this.options.forcePathStyle,
        credentials: {
          accessKeyId: this.options.accessKey,
          secretAccessKey: this.options.secretKey,
        },
      });
    }
    return this.client;
  }

  private static isMissing(error: unknown): boolean {
    const name = error instanceof Error ? error.name : "";
    return name === "NoSuchKey" || name === "NotFound";
  }

  private static unavailable(operation: string, error: unknown): never {
    logger.error("Object storage request failed", error, { operation });
    throw new ServiceUnavailableError(
      "ارتباط با فضای ذخیره‌سازی برقرار نشد. کمی بعد دوباره تلاش کنید.",
      `s3 ${operation} failed`,
    );
  }

  async put(input: PutObjectInput): Promise<StoredObjectMetadata> {
    const objectKey = assertSafeObjectKey(input.objectKey);
    try {
      const client = await this.getClient();
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      await client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          Body: input.body,
          ContentType: input.contentType,
        }),
      );
    } catch (error) {
      S3ObjectStorage.unavailable("put", error);
    }

    return {
      objectKey,
      contentType: input.contentType,
      sizeBytes: input.body.byteLength,
      lastModified: new Date(),
    };
  }

  async get(objectKey: string): Promise<GetObjectResult> {
    const key = assertSafeObjectKey(objectKey);
    try {
      const client = await this.getClient();
      const { GetObjectCommand } = await import("@aws-sdk/client-s3");
      const response = await client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      const bytes = await response.Body?.transformToByteArray();
      if (!bytes) {
        throw new NotFoundError("فایل درخواستی یافت نشد.", `empty object ${key}`);
      }
      return {
        body: bytes,
        metadata: {
          objectKey: key,
          contentType: response.ContentType ?? "application/octet-stream",
          sizeBytes: bytes.byteLength,
          lastModified: response.LastModified,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      if (S3ObjectStorage.isMissing(error)) {
        throw new NotFoundError("فایل درخواستی یافت نشد.", `missing object ${key}`);
      }
      S3ObjectStorage.unavailable("get", error);
    }
  }

  async head(objectKey: string): Promise<StoredObjectMetadata | null> {
    const key = assertSafeObjectKey(objectKey);
    try {
      const client = await this.getClient();
      const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
      const response = await client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        objectKey: key,
        contentType: response.ContentType ?? "application/octet-stream",
        sizeBytes: response.ContentLength ?? 0,
        lastModified: response.LastModified,
      };
    } catch (error) {
      if (S3ObjectStorage.isMissing(error)) return null;
      S3ObjectStorage.unavailable("head", error);
    }
  }

  async delete(objectKey: string): Promise<void> {
    const key = assertSafeObjectKey(objectKey);
    try {
      const client = await this.getClient();
      const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
      await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      S3ObjectStorage.unavailable("delete", error);
    }
  }
}
