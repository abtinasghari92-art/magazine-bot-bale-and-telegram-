import { parseWithSchema } from "@/lib/validation";
import {
  clearCurrentIssue,
  getIssueForAdmin,
  setCurrentIssue,
  setCurrentSchema,
} from "@/modules/catalog";
import { requireAdminSession } from "@/server/auth/admin-session";
import { catalogRepository } from "@/server/catalog";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";
import { toAdminIssueDto } from "@/server/presenters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Designate (or release) the current issue (REQ-010).
 * The repository clears the flag everywhere and sets it once inside a single
 * locked transaction, so two admins racing cannot leave two current issues.
 */
export async function POST(request: Request, context: { params: Promise<{ issueId: string }> }) {
  return handleRoute(async () => {
    await requireAdminSession();
    const { issueId } = await context.params;

    const { isCurrent } = parseWithSchema(setCurrentSchema, await readJsonBody(request));
    const repository = catalogRepository();

    if (!isCurrent) {
      await clearCurrentIssue(repository);
      return jsonOk({ issue: toAdminIssueDto(await getIssueForAdmin(repository, issueId)) });
    }

    return jsonOk({ issue: toAdminIssueDto(await setCurrentIssue(repository, issueId)) });
  });
}
