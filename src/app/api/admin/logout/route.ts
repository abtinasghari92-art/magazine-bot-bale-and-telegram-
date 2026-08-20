import { clearSessionCookie, performAdminLogout } from "@/server/auth/admin-session";
import { handleRoute, jsonOk } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Admin logout (REQ-046). The session row is revoked server-side as well as the
 * cookie cleared, so a copied cookie stops working too.
 */
export async function POST() {
  return handleRoute(async () => {
    await performAdminLogout();
    return clearSessionCookie(jsonOk({ ok: true }));
  });
}
