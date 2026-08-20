import {
  attachSessionCookie,
  performAdminLogin,
} from "@/server/auth/admin-session";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Admin login (REQ-046).
 *
 * There is no matching `POST /register`: admin accounts are created only by the
 * documented bootstrap command, never over HTTP.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = await readJsonBody(request);
    const { admin, token } = await performAdminLogin(request, body);

    const response = jsonOk({
      admin: { id: admin.id, email: admin.email, name: admin.name },
    });
    return attachSessionCookie(response, token);
  });
}
