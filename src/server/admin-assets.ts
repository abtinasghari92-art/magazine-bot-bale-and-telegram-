import "server-only";

import { createHash } from "node:crypto";

import { getUploadLimits } from "@/lib/env";
import { ServiceUnavailableError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { attachIssueAsset, detachIssueAsset, type MediaAssetKind } from "@/modules/catalog";
import { countPdfPages } from "@/modules/preview";
import { buildObjectKey, type ObjectKeyPurpose } from "@/modules/storage";
import { FieldValidationError } from "@/lib/validation";
import { catalogRepository } from "@/server/catalog";
import { getObjectStorage } from "@/server/storage";

/**
 * Admin asset uploads (REQ-048 / REQ-014).
 *
 * The browser sends bytes and nothing else that matters. The object key, the
 * asset id and the issue association are all decided here, so a client cannot
 * point an issue at an object it does not own, nor overwrite one by naming it.
 *
 * The uploaded content type is checked against the bytes' own magic number, not
 * the `Content-Type` the browser claimed — a PDF field must really receive a
 * PDF before it reaches the preview builder.
 */

type AssetKindSpec = {
  purpose: ObjectKeyPurpose;
  allowedContentTypes: readonly string[];
  maxBytes: () => number;
  fieldLabel: string;
};

const KIND_SPECS: Record<MediaAssetKind, AssetKindSpec> = {
  ISSUE_COVER: {
    purpose: "cover",
    allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
    maxBytes: () => getUploadLimits().maxCoverBytes,
    fieldLabel: "تصویر جلد",
  },
  ISSUE_PREVIEW_PDF: {
    purpose: "preview",
    allowedContentTypes: ["application/pdf"],
    maxBytes: () => getUploadLimits().maxPdfBytes,
    fieldLabel: "فایل پیش‌نمایش",
  },
  ISSUE_DIGITAL_PDF: {
    purpose: "digital",
    allowedContentTypes: ["application/pdf"],
    maxBytes: () => getUploadLimits().maxPdfBytes,
    fieldLabel: "فایل دیجیتال",
  },
};

/** Map a URL segment to an asset kind. Anything else is not an upload target. */
export function parseAssetKind(raw: string): MediaAssetKind {
  switch (raw) {
    case "cover":
      return "ISSUE_COVER";
    case "preview":
      return "ISSUE_PREVIEW_PDF";
    case "digital":
      return "ISSUE_DIGITAL_PDF";
    default:
      throw new FieldValidationError([
        { field: "kind", message: "نوع فایل معتبر نیست." },
      ]);
  }
}

/**
 * Sniff the real type from the leading bytes.
 *
 * A browser-supplied MIME type is a hint, not evidence: accepting it would let
 * an arbitrary file reach `pdf-lib` or be served back with an image header.
 */
function detectContentType(bytes: Uint8Array): string | null {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return "application/pdf";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function invalidFile(message: string): never {
  throw new FieldValidationError([{ field: "file", message }]);
}

/** Pull the single `file` part out of a multipart admin upload. */
export async function readUploadedFile(request: Request): Promise<{
  bytes: Uint8Array;
  originalFilename: string | null;
}> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    invalidFile("فایلی دریافت نشد.");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    invalidFile("فایلی انتخاب نشده است.");
  }

  return {
    bytes: new Uint8Array(await file.arrayBuffer()),
    originalFilename: file.name ? file.name.slice(0, 200) : null,
  };
}

/**
 * Store an uploaded file and attach it to an issue.
 *
 * Order matters: the object is written first, the row second, and the replaced
 * object is deleted last. A crash therefore leaves an orphaned object, never an
 * issue pointing at bytes that are not there.
 */
export async function uploadIssueAsset(input: {
  issueId: string;
  kind: MediaAssetKind;
  bytes: Uint8Array;
  originalFilename: string | null;
}): Promise<{ assetId: string; pageCount: number | null }> {
  const spec = KIND_SPECS[input.kind];
  const maxBytes = spec.maxBytes();

  if (input.bytes.byteLength > maxBytes) {
    invalidFile(
      `${spec.fieldLabel} نباید بیش از ${Math.floor(maxBytes / (1024 * 1024))} مگابایت باشد.`,
    );
  }

  const detected = detectContentType(input.bytes);
  if (!detected || !spec.allowedContentTypes.includes(detected)) {
    invalidFile(`قالب ${spec.fieldLabel} پشتیبانی نمی‌شود.`);
  }

  const storage = getObjectStorage();
  if (!storage.canWrite) {
    // Staging and production without credentials land here. Refusing is the
    // point: a "successful" upload onto an ephemeral disk would be worse.
    logger.error("Asset upload refused: object storage is not writable", undefined, {
      provider: storage.provider,
      kind: input.kind,
    });
    throw new ServiceUnavailableError(
      "فضای ذخیره‌سازی فایل پیکربندی نشده است. با پشتیبانی فنی تماس بگیرید.",
      `object storage provider ${storage.provider} cannot write`,
    );
  }

  // A malformed PDF must fail before it is stored, not when a reader opens it.
  const pageCount =
    detected === "application/pdf" ? await countPdfPages(input.bytes) : null;

  const objectKey = buildObjectKey({
    issueId: input.issueId,
    purpose: spec.purpose,
    contentType: detected,
    originalFilename: input.originalFilename ?? undefined,
  });

  const stored = await storage.put({
    objectKey,
    body: input.bytes,
    contentType: detected,
    originalFilename: input.originalFilename ?? undefined,
  });

  const repository = catalogRepository();
  const asset = await repository.createAsset({
    kind: input.kind,
    provider: storage.provider,
    bucket: storage.bucket ?? null,
    objectKey: stored.objectKey,
    contentType: detected,
    sizeBytes: stored.sizeBytes,
    checksum:
      stored.checksum ?? createHash("sha256").update(input.bytes).digest("hex"),
    originalFilename: input.originalFilename,
    pageCount,
  });

  const { replacedAssetId } = await attachIssueAsset(
    repository,
    input.issueId,
    input.kind,
    asset,
  );
  await discardReplacedAsset(replacedAssetId);

  return { assetId: asset.id, pageCount };
}

/** Detach the asset of one kind from an issue and drop the stored object. */
export async function removeIssueAsset(
  issueId: string,
  kind: MediaAssetKind,
): Promise<void> {
  const repository = catalogRepository();
  const { replacedAssetId } = await detachIssueAsset(repository, issueId, kind);
  await discardReplacedAsset(replacedAssetId);
}

/**
 * Delete a replaced asset's object and row.
 *
 * Best-effort: the issue no longer references it, so a failure here leaves an
 * unreferenced object rather than a broken page. It is logged, not thrown.
 */
async function discardReplacedAsset(assetId: string | null): Promise<void> {
  if (!assetId) return;

  const repository = catalogRepository();
  try {
    const asset = await repository.findAssetById(assetId);
    if (asset) {
      await getObjectStorage().delete(asset.objectKey);
    }
    await repository.deleteAsset(assetId);
  } catch (error) {
    logger.warn("Replaced asset was not fully removed", {
      assetId,
      reason: error instanceof Error ? error.name : "unknown",
    });
  }
}
