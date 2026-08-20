import { NotFoundError, ServiceUnavailableError } from "@/lib/errors";

import type {
  GetObjectResult,
  ObjectStorage,
  PutObjectInput,
  StoredObjectMetadata,
} from "./types";

const MESSAGE =
  "فضای ذخیره‌سازی فایل هنوز پیکربندی نشده است. تا آن زمان بارگذاری فایل ممکن نیست.";

/**
 * The adapter used when no storage credentials exist outside development.
 *
 * It fails loudly instead of writing production files to the container's
 * ephemeral disk, where the next deploy would silently delete them.
 */
export class UnavailableObjectStorage implements ObjectStorage {
  readonly provider = "none" as const;
  readonly canWrite = false;

  private unavailable(operation: string): never {
    throw new ServiceUnavailableError(
      MESSAGE,
      `object storage is not configured (${operation})`,
    );
  }

  async put(_input: PutObjectInput): Promise<StoredObjectMetadata> {
    this.unavailable("put");
  }

  async get(objectKey: string): Promise<GetObjectResult> {
    throw new NotFoundError(
      "فایل درخواستی در دسترس نیست.",
      `object storage is not configured (get ${objectKey})`,
    );
  }

  async head(_objectKey: string): Promise<StoredObjectMetadata | null> {
    return null;
  }

  async delete(_objectKey: string): Promise<void> {
    this.unavailable("delete");
  }
}
