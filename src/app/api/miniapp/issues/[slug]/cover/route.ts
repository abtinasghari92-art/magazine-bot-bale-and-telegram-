import { NextResponse } from "next/server";

import { NotFoundError } from "@/lib/errors";
import { verifyRequestInitData } from "@/server/auth/telegram-session";
import { loadPublishedIssue } from "@/server/catalog";
import { handleRoute } from "@/server/http";
import { getObjectStorage } from "@/server/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Cover image for a published issue.
 *
 * The browser asks for an *issue*; the server resolves the object key. No key
 * ever reaches the client, so there is nothing to tamper with in the URL.
 */
export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  return handleRoute(async () => {
    // An <img> tag cannot send an Authorization header, so this route also
    // accepts signed init data from the query string.
    verifyRequestInitData(request, { allowQueryParam: true });
    const { slug } = await context.params;

    const { cover } = await loadPublishedIssue(slug);
    if (!cover) {
      throw new NotFoundError("تصویر جلد برای این شماره ثبت نشده است.");
    }

    const object = await getObjectStorage().get(cover.objectKey);

    return new NextResponse(Buffer.from(object.body), {
      status: 200,
      headers: {
        "Content-Type": cover.contentType,
        "Content-Length": String(object.body.byteLength),
        // Covers are public catalog art and change only when an admin replaces
        // them, but the response is still per-request authorized.
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
      },
    });
  });
}
