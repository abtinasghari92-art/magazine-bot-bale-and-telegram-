import { archiveIssue } from "@/modules/catalog";
import { requireAdminSession } from "@/server/auth/admin-session";
import { catalogRepository } from "@/server/catalog";
import { handleRoute, jsonOk } from "@/server/http";
import { toAdminIssueDto } from "@/server/presenters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Safe delete (REQ-048): the row is archived, never destroyed.
 * Later orders and downloads must keep resolving the issue they referenced, so
 * there is deliberately no hard-delete endpoint.
 */
export async function POST(_request: Request, context: { params: Promise<{ issueId: string }> }) {
  return handleRoute(async () => {
    await requireAdminSession();
    const { issueId } = await context.params;

    const issue = await archiveIssue(catalogRepository(), issueId);
    return jsonOk({ issue: toAdminIssueDto(issue) });
  });
}
