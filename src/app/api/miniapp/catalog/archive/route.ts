import { getArchiveFacets, listArchive, parseCatalogQuery } from "@/modules/catalog";
import { CATALOG_EVENT, recordAnalyticsEventSafely } from "@/server/analytics";
import { verifyRequestInitData } from "@/server/auth/telegram-session";
import { catalogRepository, telegramAttribution } from "@/server/catalog";
import { handleRoute, jsonOk } from "@/server/http";
import { toIssueSummaryDto } from "@/server/presenters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Archive listing (REQ-012 / REQ-013).
 *
 * The query string is validated and the page size capped server-side, so no
 * caller can ask for the whole catalog in one request. Facets ride along on the
 * first page only — they do not change while the reader pages through.
 */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const telegram = verifyRequestInitData(request);
    const url = new URL(request.url);
    const query = parseCatalogQuery(Object.fromEntries(url.searchParams));

    const repository = catalogRepository();
    const page = await listArchive(repository, query);

    const coverIds = page.items
      .map((issue) => issue.coverAssetId)
      .filter((id): id is string => typeof id === "string");
    const covers = await Promise.all(coverIds.map((id) => repository.findAssetById(id)));
    const coverById = new Map(covers.filter((asset) => asset !== null).map((a) => [a.id, a]));

    const isFirstPage = !query.cursor;
    const facets = isFirstPage ? await getArchiveFacets(repository) : null;

    const hasFilter =
      query.year !== undefined || query.season !== undefined || query.topic !== undefined;

    if (isFirstPage && query.search) {
      recordAnalyticsEventSafely(CATALOG_EVENT.searchArchive, telegramAttribution(telegram), {
        resultCount: page.items.length,
        hasFilter,
      });
    } else if (isFirstPage && hasFilter) {
      recordAnalyticsEventSafely(CATALOG_EVENT.filterArchive, telegramAttribution(telegram), {
        year: query.year ?? null,
        season: query.season ?? null,
        hasTopic: query.topic !== undefined,
        resultCount: page.items.length,
      });
    }

    return jsonOk({
      items: page.items.map((issue) =>
        toIssueSummaryDto(issue, issue.coverAssetId ? coverById.get(issue.coverAssetId) : null),
      ),
      nextCursor: page.nextCursor,
      facets,
    });
  });
}
