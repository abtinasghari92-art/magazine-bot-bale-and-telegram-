import {
  createIssue,
  listIssuesForAdmin,
  parseAdminIssueQuery,
} from "@/modules/catalog";
import { requireAdminSession } from "@/server/auth/admin-session";
import { catalogRepository } from "@/server/catalog";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";
import { toAdminIssueDto } from "@/server/presenters";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** List issues in any status (REQ-048). Admin session required. */
export async function GET(request: Request) {
  return handleRoute(async () => {
    await requireAdminSession();

    const url = new URL(request.url);
    const query = parseAdminIssueQuery(Object.fromEntries(url.searchParams));
    const page = await listIssuesForAdmin(catalogRepository(), query);

    return jsonOk({
      items: page.items.map((issue) => toAdminIssueDto(issue)),
      nextCursor: page.nextCursor,
    });
  });
}

/** Create an issue (REQ-048). It starts as a draft; publishing is a separate call. */
export async function POST(request: Request) {
  return handleRoute(async () => {
    await requireAdminSession();

    const body = await readJsonBody(request);
    const issue = await createIssue(catalogRepository(), body);

    return jsonOk({ issue: toAdminIssueDto(issue) }, 201);
  });
}
