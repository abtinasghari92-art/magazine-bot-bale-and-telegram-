import { NextResponse } from "next/server";

import { toEnglishDigits } from "@/lib/persian";
import { FieldValidationError } from "@/lib/validation";
import { buildPreviewPdf } from "@/modules/preview";
import { CATALOG_EVENT, recordAnalyticsEventSafely } from "@/server/analytics";
import { verifyRequestInitData } from "@/server/auth/telegram-session";
import {
  assertPreviewAvailable,
  loadPublishedIssue,
  telegramAttribution,
  watermarkTextFor,
} from "@/server/catalog";
import { handleRoute } from "@/server/http";
import { getObjectStorage } from "@/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Limited, watermarked PDF preview (REQ-014).
 *
 * The security design, stated plainly: the source file is read **server-side**,
 * the allowed pages are copied into a brand-new document, every one of them is
 * stamped, and only that new document is sent. There is no route, and no
 * parameter, that returns the stored file. Hiding pages in the viewer is never
 * what enforces the limit — the bytes for the other pages are never produced.
 *
 * A `page` outside the allowed range is refused rather than clamped, so a
 * client cannot walk past the limit by incrementing a number.
 *
 * REQ-071 (signed, time-limited URLs) hardens the transport on Day 6. It does
 * not replace this: the page limit is enforced here regardless.
 */

/** Parse `?page=` — 1-based, ASCII or Persian digits, optional. */
function parseRequestedPage(raw: string | null): number[] | undefined {
  if (raw === null) return undefined;
  const normalized = toEnglishDigits(raw).trim();
  if (!/^\d{1,4}$/.test(normalized)) {
    throw new FieldValidationError([{ field: "page", message: "شماره صفحه معتبر نیست." }]);
  }
  return [Number.parseInt(normalized, 10)];
}

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  return handleRoute(async () => {
    // Opened in a new tab as a document, so the header is not available here.
    const telegram = verifyRequestInitData(request, { allowQueryParam: true });
    const { slug } = await context.params;
    const pages = parseRequestedPage(new URL(request.url).searchParams.get("page"));

    const { issue, previewAsset, previewPageCount } = await loadPublishedIssue(slug);
    assertPreviewAvailable(previewAsset);

    const source = await getObjectStorage().get(previewAsset.objectKey);

    const preview = await buildPreviewPdf(
      { bytes: source.body, knownPageCount: previewAsset.pageCount },
      {
        pageLimit: previewPageCount,
        watermarkText: watermarkTextFor(issue),
        pages,
      },
    );

    recordAnalyticsEventSafely(CATALOG_EVENT.openPreview, telegramAttribution(telegram), {
      issueNumber: issue.issueNumber,
      pageCount: preview.pageNumbers.length,
    });

    return new NextResponse(Buffer.from(preview.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(preview.bytes.byteLength),
        "Content-Disposition": `inline; filename="preview-${issue.issueNumber}.pdf"`,
        // The generated file is per-issue and cheap to rebuild; never let a
        // shared cache hold a copy.
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
