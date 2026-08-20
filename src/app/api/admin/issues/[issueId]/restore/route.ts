import { restoreIssue } from "@/modules/catalog";
import { requireAdminSession } from "@/server/auth/admin-session";
import { catalogRepository } from "@/server/catalog";
import { handleRoute, jsonOk } from "@/server/http";
import { toAdminIssueDto } from "@/server/presenters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Bring an archived issue back as a draft (REQ-048). */
export async function POST(_request: Request, context: { params: Promise<{ issueId: string }> }) {
  return handleRoute(async () => {
    await requireAdminSession();
    const { issueId } = await context.params;

    const issue = await restoreIssue(catalogRepository(), issueId);
    return jsonOk({ issue: toAdminIssueDto(issue) });
  });
}
