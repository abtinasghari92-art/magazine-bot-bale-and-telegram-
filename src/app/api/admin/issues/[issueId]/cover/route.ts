import { NextResponse } from "next/server";

import { NotFoundError } from "@/lib/errors";
import { getIssueForAdmin } from "@/modules/catalog";
import { requireAdminSession } from "@/server/auth/admin-session";
import { catalogRepository } from "@/server/catalog";
import { handleRoute } from "@/server/http";
import { getObjectStorage } from "@/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cover of any issue, including a draft, for the admin forms.
 * The object key is resolved from the issue id server-side, exactly as on the
 * public route — the admin UI never handles a storage key either.
 */
export async function GET(_request: Request, context: { params: Promise<{ issueId: string }> }) {
  return handleRoute(async () => {
    await requireAdminSession();
    const { issueId } = await context.params;

    const repository = catalogRepository();
    const issue = await getIssueForAdmin(repository, issueId);
    const cover = issue.coverAssetId ? await repository.findAssetById(issue.coverAssetId) : null;
    if (!cover) {
      throw new NotFoundError("تصویر جلد برای این شماره ثبت نشده است.");
    }

    const object = await getObjectStorage().get(cover.objectKey);

    return new NextResponse(Buffer.from(object.body), {
      status: 200,
      headers: {
        "Content-Type": cover.contentType,
        "Content-Length": String(object.body.byteLength),
        "Cache-Control": "no-store",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
