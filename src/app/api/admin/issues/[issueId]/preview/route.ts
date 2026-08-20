import { NextResponse } from "next/server";

import { getPreviewConfig } from "@/lib/env";
import { NotFoundError } from "@/lib/errors";
import { getIssueForAdmin, previewPageLimitFor } from "@/modules/catalog";
import { buildPreviewPdf } from "@/modules/preview";
import { requireAdminSession } from "@/server/auth/admin-session";
import { catalogRepository, watermarkTextFor } from "@/server/catalog";
import { handleRoute } from "@/server/http";
import { getObjectStorage } from "@/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Let an admin proof the preview before publishing (REQ-048 / REQ-014).
 *
 * This works on a draft, which the public route deliberately refuses — but it
 * builds the file through exactly the same page-limited, watermarked path. An
 * admin sees what a reader would see, not the source document.
 */
export async function GET(_request: Request, context: { params: Promise<{ issueId: string }> }) {
  return handleRoute(async () => {
    await requireAdminSession();
    const { issueId } = await context.params;

    const repository = catalogRepository();
    const issue = await getIssueForAdmin(repository, issueId);

    const asset = issue.previewPdfAssetId
      ? await repository.findAssetById(issue.previewPdfAssetId)
      : null;
    if (!asset) {
      throw new NotFoundError("پیش‌نمایشی برای این شماره ثبت نشده است.");
    }

    const source = await getObjectStorage().get(asset.objectKey);
    const preview = await buildPreviewPdf(
      { bytes: source.body, knownPageCount: asset.pageCount },
      {
        pageLimit: previewPageLimitFor(issue, getPreviewConfig().pageLimit),
        watermarkText: watermarkTextFor(issue),
      },
    );

    return new NextResponse(Buffer.from(preview.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(preview.bytes.byteLength),
        "Content-Disposition": `inline; filename="preview-${issue.issueNumber}.pdf"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
