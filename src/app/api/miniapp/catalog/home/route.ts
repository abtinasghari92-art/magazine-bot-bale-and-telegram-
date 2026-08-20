import { getCurrentIssue } from "@/modules/catalog";
import { verifyRequestInitData } from "@/server/auth/telegram-session";
import { CATALOG_EVENT, recordAnalyticsEventSafely } from "@/server/analytics";
import {
  catalogRepository,
  resolvePreviewPageCount,
  telegramAttribution,
} from "@/server/catalog";
import { handleRoute, jsonOk } from "@/server/http";
import { toIssueDetailDto } from "@/server/presenters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Home payload (REQ-010): the designated current issue, else the latest
 * published one. Published rows only — the repository never widens that.
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const telegram = verifyRequestInitData(request);
    const repository = catalogRepository();

    const issue = await getCurrentIssue(repository);
    if (!issue) {
      recordAnalyticsEventSafely(CATALOG_EVENT.viewHome, telegramAttribution(telegram), {
        hasCurrentIssue: false,
      });
      return jsonOk({ currentIssue: null });
    }

    const [cover, previewAsset] = await Promise.all([
      issue.coverAssetId ? repository.findAssetById(issue.coverAssetId) : Promise.resolve(null),
      issue.previewPdfAssetId
        ? repository.findAssetById(issue.previewPdfAssetId)
        : Promise.resolve(null),
    ]);

    recordAnalyticsEventSafely(CATALOG_EVENT.viewHome, telegramAttribution(telegram), {
      hasCurrentIssue: true,
      issueNumber: issue.issueNumber,
    });

    return jsonOk({
      currentIssue: toIssueDetailDto(issue, {
        cover,
        previewPageCount: resolvePreviewPageCount(issue, previewAsset),
      }),
    });
  });
}
