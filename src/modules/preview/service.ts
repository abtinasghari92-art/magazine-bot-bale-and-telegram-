import { PDFDocument } from "pdf-lib";

import { AppError } from "@/lib/errors";
import { FieldValidationError } from "@/lib/validation";

import { drawWatermark, embedWatermarkFont } from "./watermark";

/**
 * Limited, watermarked PDF preview (REQ-014).
 *
 * The security property this module exists for: the browser never receives the
 * source file. The server loads the stored PDF, copies **only** the allowed
 * pages into a brand-new document, stamps every one of them, and returns that.
 * There is no code path that streams the original bytes to a client, so hiding
 * pages in the UI is never load-bearing.
 *
 * REQ-071 (signed, time-limited URLs) hardens the transport on Day 6; it does
 * not replace this limit.
 */

export const MAX_PREVIEW_PAGE_LIMIT = 50;

export type PreviewSource = {
  bytes: Uint8Array;
  /** Page count recorded when the file was uploaded, if known. */
  knownPageCount?: number | null;
};

export type PreviewOptions = {
  /** Global default (DEC-006) already merged with any per-issue override. */
  pageLimit: number;
  watermarkText: string;
  /** 1-based page numbers. Omitted means "every allowed page". */
  pages?: number[];
};

export type PreviewResult = {
  bytes: Uint8Array;
  /** Pages actually returned. */
  pageNumbers: number[];
  /** Pages this issue is allowed to expose, whatever the caller asked for. */
  allowedPageCount: number;
  sourcePageCount: number;
};

/** Clamp a configured limit into something sane before it reaches page maths. */
export function normalizePageLimit(limit: number | null | undefined, fallback: number): number {
  const candidate = Number.isInteger(limit) && (limit as number) > 0 ? (limit as number) : fallback;
  return Math.max(1, Math.min(MAX_PREVIEW_PAGE_LIMIT, candidate));
}

/** How many pages this issue may expose, given the source file's real length. */
export function allowedPreviewPageCount(sourcePageCount: number, pageLimit: number): number {
  return Math.max(0, Math.min(sourcePageCount, normalizePageLimit(pageLimit, pageLimit)));
}

function unreadableFile(): never {
  throw new FieldValidationError([
    { field: "file", message: "فایل PDF خوانده نشد. فایل سالم و بدون رمز بارگذاری کنید." },
  ]);
}

async function loadSource(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch {
    unreadableFile();
  }
}

/**
 * Page count of a loaded document.
 *
 * `PDFDocument.load` accepts some structurally broken files and only fails when
 * the page tree is first walked. Without this guard that surfaces as a raw
 * `TypeError` — a 500 for what is really "your file is corrupt", and one more
 * unmapped exception reaching the error boundary.
 */
function readPageCount(document: PDFDocument): number {
  try {
    return document.getPageCount();
  } catch {
    unreadableFile();
  }
}

/** Page count of a stored PDF, used when an admin uploads a preview file. */
export async function countPdfPages(bytes: Uint8Array): Promise<number> {
  return readPageCount(await loadSource(bytes));
}

/**
 * Build the preview document.
 *
 * Requesting a page beyond the allowed range is rejected, not silently
 * clamped — a client must not be able to walk past the limit by guessing.
 */
export async function buildPreviewPdf(
  source: PreviewSource,
  options: PreviewOptions,
): Promise<PreviewResult> {
  const document = await loadSource(source.bytes);
  const sourcePageCount = readPageCount(document);
  const allowed = allowedPreviewPageCount(sourcePageCount, options.pageLimit);

  if (allowed === 0) {
    throw new AppError("forbidden", "پیش‌نمایشی برای این شماره در دسترس نیست.");
  }

  const requested = options.pages ?? Array.from({ length: allowed }, (_, index) => index + 1);
  const unique = [...new Set(requested)].sort((a, b) => a - b);

  for (const pageNumber of unique) {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > allowed) {
      throw new AppError(
        "forbidden",
        "این صفحه در پیش‌نمایش در دسترس نیست.",
        `requested preview page ${pageNumber} outside 1..${allowed}`,
      );
    }
  }

  const output = await PDFDocument.create();
  const font = await embedWatermarkFont(output);

  let copied;
  try {
    copied = await output.copyPages(
      document,
      unique.map((pageNumber) => pageNumber - 1),
    );
  } catch {
    // A page that cannot be copied is a broken source file, not a server fault.
    unreadableFile();
  }
  for (const page of copied) {
    output.addPage(page);
    drawWatermark(page, font, options.watermarkText);
  }

  // Never echo the source document's metadata into the preview.
  output.setTitle("");
  output.setAuthor("");
  output.setSubject("");
  output.setProducer("");
  output.setCreator("");

  return {
    bytes: await output.save({ useObjectStreams: false }),
    pageNumbers: unique,
    allowedPageCount: allowed,
    sourcePageCount,
  };
}
