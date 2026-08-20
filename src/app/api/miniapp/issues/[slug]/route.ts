import { CATALOG_EVENT, recordAnalyticsEventSafely } from "@/server/analytics";
import { verifyRequestInitData } from "@/server/auth/telegram-session";
import { loadPublishedIssue, telegramAttribution } from "@/server/catalog";
import { handleRoute, jsonOk } from "@/server/http";
import { toIssueDetailDto } from "@/server/presenters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Issue detail (REQ-011).
 *
 * A draft or archived slug answers 404 with the same body a missing slug gets,
 * so walking URLs cannot confirm that unpublished content exists.
 */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  return handleRoute(async () => {
    const telegram = verifyRequestInitData(request);
    const { slug } = await context.params;

    const { issue, cover, previewPageCount } = await loadPublishedIssue(slug);

    recordAnalyticsEventSafely(CATALOG_EVENT.viewIssue, telegramAttribution(telegram), {
      issueNumber: issue.issueNumber,
      inStock: issue.stock > 0,
    });

    return jsonOk({ issue: toIssueDetailDto(issue, { cover, previewPageCount }) });
  });
}
