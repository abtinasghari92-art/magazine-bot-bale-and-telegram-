import { randomUUID } from "node:crypto";

/**
 * Object key generation.
 *
 * Keys are opaque server-side identifiers. They are never accepted from a
 * browser and never rendered into a page: a caller asks for an *issue* and the
 * server looks the key up. The random segment also stops anyone from guessing
 * a neighbouring issue's object even if a key ever leaked.
 */

export type ObjectKeyPurpose = "cover" | "preview" | "digital";

const PURPOSE_FOLDER: Record<ObjectKeyPurpose, string> = {
  cover: "covers",
  preview: "previews",
  digital: "digital",
};

/** Conservative extension whitelist — the extension is cosmetic, not trusted. */
const ALLOWED_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "pdf"]);

export function extensionFor(contentType: string, originalFilename?: string): string {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      break;
  }

  const fromName = originalFilename?.toLowerCase().split(".").pop() ?? "";
  return ALLOWED_EXTENSIONS.has(fromName) ? fromName : "bin";
}

/** `issues/<issueId>/<folder>/<random>.<ext>` — stable prefix, unguessable leaf. */
export function buildObjectKey(input: {
  issueId: string;
  purpose: ObjectKeyPurpose;
  contentType: string;
  originalFilename?: string;
}): string {
  const safeIssueId = input.issueId.replace(/[^A-Za-z0-9_-]/g, "");
  if (!safeIssueId) {
    throw new Error("issueId is required to build an object key");
  }
  const extension = extensionFor(input.contentType, input.originalFilename);
  return `issues/${safeIssueId}/${PURPOSE_FOLDER[input.purpose]}/${randomUUID()}.${extension}`;
}

/**
 * Reject anything that could escape the bucket prefix or address a parent
 * folder. Applied to every key before it reaches an adapter.
 */
export function isSafeObjectKey(objectKey: string): boolean {
  if (!objectKey || objectKey.length > 512) return false;
  if (objectKey.startsWith("/") || objectKey.includes("//")) return false;
  if (objectKey.split("/").some((segment) => segment === "." || segment === "..")) {
    return false;
  }
  return /^[A-Za-z0-9._/-]+$/.test(objectKey);
}

export function assertSafeObjectKey(objectKey: string): string {
  if (!isSafeObjectKey(objectKey)) {
    throw new Error("unsafe object key");
  }
  return objectKey;
}
