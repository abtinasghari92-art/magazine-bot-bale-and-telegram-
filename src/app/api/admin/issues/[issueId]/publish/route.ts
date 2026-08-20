import { parseWithSchema } from "@/lib/validation";
import { setIssuePublished, setPublishedSchema } from "@/modules/catalog";
import { requireAdminSession } from "@/server/auth/admin-session";
import { catalogRepository } from "@/server/catalog";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";
import { toAdminIssueDto } from "@/server/presenters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Publish or unpublish (REQ-048).
 * Unpublishing also releases the "current" designation, so the home page can
 * never end up pointing at hidden content.
 */
export async function POST(request: Request, context: { params: Promise<{ issueId: string }> }) {
  return handleRoute(async () => {
    await requireAdminSession();
    const { issueId } = await context.params;

    const { published } = parseWithSchema(setPublishedSchema, await readJsonBody(request));
    const issue = await setIssuePublished(catalogRepository(), issueId, published);

    return jsonOk({ issue: toAdminIssueDto(issue) });
  });
}
