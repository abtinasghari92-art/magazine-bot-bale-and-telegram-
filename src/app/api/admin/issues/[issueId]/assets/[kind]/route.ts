import { getIssueForAdmin } from "@/modules/catalog";
import {
  parseAssetKind,
  readUploadedFile,
  removeIssueAsset,
  uploadIssueAsset,
} from "@/server/admin-assets";
import { requireAdminSession } from "@/server/auth/admin-session";
import { catalogRepository } from "@/server/catalog";
import { handleRoute, jsonOk } from "@/server/http";
import { toAdminIssueDto } from "@/server/presenters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ issueId: string; kind: string }> };

/**
 * Upload a cover or preview PDF for an issue (REQ-048 / REQ-014).
 *
 * The issue is resolved and authorized *before* any bytes are stored, and the
 * object key is generated server-side. The browser never names a storage
 * location, so there is nothing in this request that could address another
 * issue's files.
 */
export async function PUT(request: Request, context: Context) {
  return handleRoute(async () => {
    await requireAdminSession();
    const { issueId, kind } = await context.params;
    const assetKind = parseAssetKind(kind);

    const repository = catalogRepository();
    const existing = await getIssueForAdmin(repository, issueId);

    const file = await readUploadedFile(request);
    const { pageCount } = await uploadIssueAsset({
      issueId: existing.id,
      kind: assetKind,
      bytes: file.bytes,
      originalFilename: file.originalFilename,
    });

    const issue = await getIssueForAdmin(repository, existing.id);
    const previewAsset = issue.previewPdfAssetId
      ? await repository.findAssetById(issue.previewPdfAssetId)
      : null;

    return jsonOk({ issue: toAdminIssueDto(issue, previewAsset), pageCount });
  });
}

/** Detach the asset of this kind and delete the stored object. */
export async function DELETE(_request: Request, context: Context) {
  return handleRoute(async () => {
    await requireAdminSession();
    const { issueId, kind } = await context.params;
    const assetKind = parseAssetKind(kind);

    const repository = catalogRepository();
    const existing = await getIssueForAdmin(repository, issueId);
    await removeIssueAsset(existing.id, assetKind);

    return jsonOk({ issue: toAdminIssueDto(await getIssueForAdmin(repository, existing.id)) });
  });
}
