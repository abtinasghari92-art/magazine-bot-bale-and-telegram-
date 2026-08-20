import { getIssueForAdmin, updateIssue } from "@/modules/catalog";
import { requireAdminSession } from "@/server/auth/admin-session";
import { catalogRepository } from "@/server/catalog";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";
import { toAdminIssueDto } from "@/server/presenters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Context = { params: Promise<{ issueId: string }> };

export async function GET(_request: Request, context: Context) {
  return handleRoute(async () => {
    await requireAdminSession();
    const { issueId } = await context.params;

    const repository = catalogRepository();
    const issue = await getIssueForAdmin(repository, issueId);
    const previewAsset = issue.previewPdfAssetId
      ? await repository.findAssetById(issue.previewPdfAssetId)
      : null;

    return jsonOk({ issue: toAdminIssueDto(issue, previewAsset) });
  });
}

/** Edit an issue (REQ-048). Only the fields present in the body are written. */
export async function PATCH(request: Request, context: Context) {
  return handleRoute(async () => {
    await requireAdminSession();
    const { issueId } = await context.params;

    const body = await readJsonBody(request);
    const issue = await updateIssue(catalogRepository(), issueId, body);

    return jsonOk({ issue: toAdminIssueDto(issue) });
  });
}
