import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { NotFoundError } from "@/lib/errors";

import { assertSafeObjectKey } from "./keys";
import type {
  GetObjectResult,
  ObjectStorage,
  PutObjectInput,
  StoredObjectMetadata,
} from "./types";

/**
 * Development-only adapter (REQ-014 foundation).
 *
 * Files land in a git-ignored folder under the repository so a developer can
 * exercise upload → preview without an S3 bucket. It is constructed only for
 * `development` / `test`; staging and production get `UnavailableObjectStorage`
 * instead, so no production file is ever written to ephemeral container disk.
 *
 * The content type is stored beside the object because the filesystem has no
 * metadata slot for it.
 */
export class LocalObjectStorage implements ObjectStorage {
  readonly provider = "local" as const;
  readonly canWrite = true;

  constructor(private readonly rootDirectory: string) {}

  private resolve(objectKey: string): string {
    const safeKey = assertSafeObjectKey(objectKey);
    const target = path.resolve(this.rootDirectory, safeKey);
    const root = path.resolve(this.rootDirectory);
    // Belt and braces: the key was validated, and the result must still be inside root.
    if (target !== root && !target.startsWith(root + path.sep)) {
      throw new Error("unsafe object key");
    }
    return target;
  }

  async put(input: PutObjectInput): Promise<StoredObjectMetadata> {
    const target = this.resolve(input.objectKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, input.body);
    await writeFile(
      `${target}.meta.json`,
      JSON.stringify({
        contentType: input.contentType,
        originalFilename: input.originalFilename ?? null,
      }),
      "utf8",
    );

    return {
      objectKey: input.objectKey,
      contentType: input.contentType,
      sizeBytes: input.body.byteLength,
      checksum: createHash("sha256").update(input.body).digest("hex"),
      lastModified: new Date(),
    };
  }

  private async readContentType(target: string): Promise<string> {
    try {
      const raw = await readFile(`${target}.meta.json`, "utf8");
      const parsed = JSON.parse(raw) as { contentType?: unknown };
      return typeof parsed.contentType === "string"
        ? parsed.contentType
        : "application/octet-stream";
    } catch {
      return "application/octet-stream";
    }
  }

  async get(objectKey: string): Promise<GetObjectResult> {
    const target = this.resolve(objectKey);
    let body: Buffer;
    try {
      body = await readFile(target);
    } catch {
      throw new NotFoundError("فایل درخواستی یافت نشد.", `missing object ${objectKey}`);
    }

    return {
      body: Uint8Array.from(body),
      metadata: {
        objectKey,
        contentType: await this.readContentType(target),
        sizeBytes: body.byteLength,
        checksum: createHash("sha256").update(body).digest("hex"),
      },
    };
  }

  async head(objectKey: string): Promise<StoredObjectMetadata | null> {
    const target = this.resolve(objectKey);
    try {
      const stats = await stat(target);
      return {
        objectKey,
        contentType: await this.readContentType(target),
        sizeBytes: stats.size,
        lastModified: stats.mtime,
      };
    } catch {
      return null;
    }
  }

  async delete(objectKey: string): Promise<void> {
    const target = this.resolve(objectKey);
    await rm(target, { force: true });
    await rm(`${target}.meta.json`, { force: true });
  }
}
