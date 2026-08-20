import "server-only";

import { getPreviewConfig } from "@/lib/env";
import { NotFoundError } from "@/lib/errors";
import {
  getPublishedIssue,
  previewPageLimitFor,
  type MagazineIssueRecord,
  type MediaAssetRecord,
} from "@/modules/catalog";
import { allowedPreviewPageCount } from "@/modules/preview";
import type { AttributionInput } from "@/modules/attribution";
import type { VerifiedInitData } from "@/modules/telegram/types";
import { getPrisma } from "@/server/db";
import { PrismaCatalogRepository } from "@/server/repositories/catalog-repository";

/**
 * Shared catalog plumbing for route handlers.
 *
 * Route files stay thin: they authorize, validate, call one of these, and
 * present. All the "which repository, which limit" decisions live here.
 */

export function catalogRepository(): PrismaCatalogRepository {
  return new PrismaCatalogRepository(getPrisma());
}

/** Attribution for a catalog analytics event, taken from verified init data. */
export function telegramAttribution(
  telegram: VerifiedInitData,
  source?: string | null,
): AttributionInput {
  return {
    channel: "TELEGRAM",
    messengerUserId: telegram.user.id,
    startParam: telegram.startParam,
    source: source ?? null,
  };
}

/**
 * Load a published issue plus the assets a public page may reference.
 * An unpublished slug is a 404 here, exactly as it is for a guessed URL.
 */
export async function loadPublishedIssue(slug: string): Promise<{
  issue: MagazineIssueRecord;
  cover: MediaAssetRecord | null;
  previewAsset: MediaAssetRecord | null;
  previewPageCount: number;
}> {
  const repository = catalogRepository();
  const issue = await getPublishedIssue(repository, slug);

  const [cover, previewAsset] = await Promise.all([
    issue.coverAssetId ? repository.findAssetById(issue.coverAssetId) : Promise.resolve(null),
    issue.previewPdfAssetId
      ? repository.findAssetById(issue.previewPdfAssetId)
      : Promise.resolve(null),
  ]);

  return {
    issue,
    cover,
    previewAsset,
    previewPageCount: resolvePreviewPageCount(issue, previewAsset),
  };
}

/**
 * How many pages this issue may expose (REQ-014).
 *
 * The per-issue override narrows or widens the global DEC-006 default, and the
 * real page count of the stored file caps both. A file we have not counted
 * yields the configured limit, and `buildPreviewPdf` re-derives the same bound
 * from the actual document before it copies a single page.
 */
export function resolvePreviewPageCount(
  issue: MagazineIssueRecord,
  previewAsset: MediaAssetRecord | null,
): number {
  if (!issue.previewPdfAssetId) return 0;
  const limit = previewPageLimitFor(issue, getPreviewConfig().pageLimit);
  const sourcePages = previewAsset?.pageCount ?? limit;
  return allowedPreviewPageCount(sourcePages, limit);
}

/**
 * Watermark text for one issue (DEC-007 — unsigned, development default).
 * The issue number goes into the mark so a leaked page is traceable to a title.
 */
export function watermarkTextFor(issue: MagazineIssueRecord): string {
  const { watermarkText } = getPreviewConfig();
  return `${watermarkText} — شماره ${issue.issueNumber}`;
}

export function assertPreviewAvailable(
  previewAsset: MediaAssetRecord | null,
): asserts previewAsset is MediaAssetRecord {
  if (!previewAsset) {
    throw new NotFoundError("پیش‌نمایشی برای این شماره ثبت نشده است.");
  }
}
