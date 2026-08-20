/**
 * Object Storage port (REQ-014 foundation).
 *
 * Domain code depends on this interface only. Nothing outside
 * `src/modules/storage` may know whether the bytes live in Liara Object
 * Storage, another S3-compatible bucket, or a local development folder.
 *
 * Signed, time-limited URLs are **not** part of this port yet — REQ-071 is
 * Day 6. Until then every read goes through a server route that authorizes the
 * caller first.
 */

export type ObjectStorageProviderName = "s3" | "local" | "none";

export type StoredObjectMetadata = {
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  checksum?: string;
  lastModified?: Date;
};

export type PutObjectInput = {
  objectKey: string;
  body: Uint8Array;
  contentType: string;
  /** Advisory only: adapters must not rely on the browser-supplied name. */
  originalFilename?: string;
};

export type GetObjectResult = {
  body: Uint8Array;
  metadata: StoredObjectMetadata;
};

export interface ObjectStorage {
  readonly provider: ObjectStorageProviderName;
  /** Bucket name when the provider has one; `undefined` for the local adapter. */
  readonly bucket?: string;

  /** True when this adapter can actually accept writes right now. */
  readonly canWrite: boolean;

  put(input: PutObjectInput): Promise<StoredObjectMetadata>;

  /** Server-side read. Never expose the returned bytes without authorization. */
  get(objectKey: string): Promise<GetObjectResult>;

  head(objectKey: string): Promise<StoredObjectMetadata | null>;

  delete(objectKey: string): Promise<void>;
}
