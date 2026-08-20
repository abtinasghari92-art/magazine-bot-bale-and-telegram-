import { ConflictError, NotFoundError } from "@/lib/errors";
import { parseWithSchema } from "@/lib/validation";

import { adminIssueQuerySchema, catalogQuerySchema, issueUpdateSchema, issueWriteSchema } from "./schema";
import type { CatalogRepository } from "./repository";
import type {
  AdminIssueQuery,
  CatalogFacets,
  CatalogQuery,
  IssuePage,
  IssueWriteData,
  MagazineIssueRecord,
  MediaAssetKind,
  MediaAssetRecord,
} from "./types";

/**
 * Catalog rules (REQ-010 … REQ-013, REQ-048).
 *
 * Two hard invariants live here:
 *
 * 1. **Public reads never see an unpublished issue.** Public methods call
 *    repository methods that filter by status themselves, so no caller can
 *    widen the scope by passing a status through.
 * 2. **At most one issue is the current issue.** `setCurrent` clears the flag
 *    everywhere and sets it once, inside a single locked transaction.
 */

export function parseCatalogQuery(input: unknown): CatalogQuery {
  return parseWithSchema(catalogQuerySchema, input ?? {});
}

export function parseAdminIssueQuery(input: unknown): AdminIssueQuery {
  return parseWithSchema(adminIssueQuerySchema, input ?? {});
}

export async function listArchive(
  repository: CatalogRepository,
  query: CatalogQuery,
): Promise<IssuePage> {
  return repository.listPublished(query);
}

export async function getArchiveFacets(repository: CatalogRepository): Promise<CatalogFacets> {
  return repository.publishedFacets();
}

/**
 * Public issue lookup by slug (REQ-011).
 * A draft or archived slug reports "not found" — guessing a URL must not
 * confirm that unpublished content exists.
 */
export async function getPublishedIssue(
  repository: CatalogRepository,
  slug: string,
): Promise<MagazineIssueRecord> {
  const normalized = slug.trim().toLowerCase();
  const issue = normalized ? await repository.findPublishedBySlug(normalized) : null;
  if (!issue) {
    throw new NotFoundError("شماره موردنظر یافت نشد.", `no published issue for slug ${slug}`);
  }
  return issue;
}

/** Current issue for the home page (REQ-010), or the latest published one. */
export async function getCurrentIssue(
  repository: CatalogRepository,
): Promise<MagazineIssueRecord | null> {
  return repository.findCurrentPublished();
}

export function isInStock(issue: MagazineIssueRecord): boolean {
  return issue.stock > 0;
}

/** Purchasable means published **and** in stock (REQ-011 acceptance). */
export function isPurchasable(issue: MagazineIssueRecord): boolean {
  return issue.status === "PUBLISHED" && isInStock(issue);
}

export async function listIssuesForAdmin(
  repository: CatalogRepository,
  query: AdminIssueQuery,
): Promise<IssuePage> {
  return repository.listAll(query);
}

export async function getIssueForAdmin(
  repository: CatalogRepository,
  issueId: string,
): Promise<MagazineIssueRecord> {
  const issue = await repository.findById(issueId);
  if (!issue) {
    throw new NotFoundError("شماره موردنظر یافت نشد.", `no issue ${issueId}`);
  }
  return issue;
}

async function assertUniqueIdentifiers(
  repository: CatalogRepository,
  data: { issueNumber?: number; slug?: string },
  currentIssueId?: string,
): Promise<void> {
  if (data.issueNumber !== undefined) {
    const existing = await repository.findByIssueNumber(data.issueNumber);
    if (existing && existing.id !== currentIssueId) {
      throw new ConflictError("شماره‌ای با این عدد قبلاً ثبت شده است.");
    }
  }
  if (data.slug !== undefined) {
    const existing = await repository.findBySlug(data.slug);
    if (existing && existing.id !== currentIssueId) {
      throw new ConflictError("این شناسه نشانی قبلاً استفاده شده است.");
    }
  }
}

export async function createIssue(
  repository: CatalogRepository,
  input: unknown,
): Promise<MagazineIssueRecord> {
  const data = parseWithSchema(issueWriteSchema, input) as IssueWriteData;
  await assertUniqueIdentifiers(repository, data);
  return repository.create(data);
}

export async function updateIssue(
  repository: CatalogRepository,
  issueId: string,
  input: unknown,
): Promise<MagazineIssueRecord> {
  const existing = await getIssueForAdmin(repository, issueId);
  const data = parseWithSchema(issueUpdateSchema, input) as Partial<IssueWriteData>;
  await assertUniqueIdentifiers(repository, data, existing.id);
  return repository.update(existing.id, data);
}

/**
 * Publish or unpublish (REQ-048). Unpublishing also gives up the "current"
 * designation, so the home page can never point at hidden content.
 */
export async function setIssuePublished(
  repository: CatalogRepository,
  issueId: string,
  published: boolean,
  now: Date = new Date(),
): Promise<MagazineIssueRecord> {
  const existing = await getIssueForAdmin(repository, issueId);

  if (published) {
    return repository.setStatus(existing.id, "PUBLISHED", {
      publishedAt: existing.publishedAt ?? now,
      archivedAt: null,
    });
  }

  if (existing.isCurrent) {
    await repository.setCurrent(null);
  }
  return repository.setStatus(existing.id, "DRAFT", { archivedAt: null });
}

/**
 * Safe delete (REQ-048): an issue is archived, never destroyed, because later
 * orders and downloads must keep resolving the row they referenced.
 */
export async function archiveIssue(
  repository: CatalogRepository,
  issueId: string,
  now: Date = new Date(),
): Promise<MagazineIssueRecord> {
  const existing = await getIssueForAdmin(repository, issueId);
  if (existing.isCurrent) {
    await repository.setCurrent(null);
  }
  return repository.setStatus(existing.id, "ARCHIVED", { archivedAt: now });
}

export async function restoreIssue(
  repository: CatalogRepository,
  issueId: string,
): Promise<MagazineIssueRecord> {
  const existing = await getIssueForAdmin(repository, issueId);
  return repository.setStatus(existing.id, "DRAFT", { archivedAt: null });
}

/** Designate the current issue (REQ-010). Only one issue may hold it. */
export async function setCurrentIssue(
  repository: CatalogRepository,
  issueId: string,
): Promise<MagazineIssueRecord> {
  const existing = await getIssueForAdmin(repository, issueId);
  if (existing.status !== "PUBLISHED") {
    throw new ConflictError("فقط یک شماره منتشرشده می‌تواند شماره جاری باشد.");
  }
  const updated = await repository.setCurrent(existing.id);
  if (!updated) {
    throw new NotFoundError("شماره موردنظر یافت نشد.", `issue ${issueId} vanished while set current`);
  }
  return updated;
}

export async function clearCurrentIssue(repository: CatalogRepository): Promise<void> {
  await repository.setCurrent(null);
}

/**
 * Attach an uploaded asset to an issue and drop the file it replaces.
 *
 * The asset id comes from the upload that just happened on the server, never
 * from the browser, so there is no way to point an issue at someone else's
 * object by guessing an id.
 */
export async function attachIssueAsset(
  repository: CatalogRepository,
  issueId: string,
  kind: MediaAssetKind,
  asset: MediaAssetRecord,
): Promise<{ issue: MagazineIssueRecord; replacedAssetId: string | null }> {
  await getIssueForAdmin(repository, issueId);
  return repository.attachAsset(issueId, kind, asset.id);
}

export async function detachIssueAsset(
  repository: CatalogRepository,
  issueId: string,
  kind: MediaAssetKind,
): Promise<{ issue: MagazineIssueRecord; replacedAssetId: string | null }> {
  await getIssueForAdmin(repository, issueId);
  return repository.attachAsset(issueId, kind, null);
}

/** Effective preview page limit for an issue: per-issue override, else global. */
export function previewPageLimitFor(
  issue: Pick<MagazineIssueRecord, "previewPageLimit">,
  globalLimit: number,
): number {
  return issue.previewPageLimit && issue.previewPageLimit > 0
    ? issue.previewPageLimit
    : globalLimit;
}
