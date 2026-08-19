import { toProfileSummary, updateProfile } from "@/modules/profile";
import { authenticateTelegramRequest } from "@/server/auth/telegram-session";
import { getPrisma } from "@/server/db";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";
import { PrismaProfileRepository } from "@/server/repositories/profile-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Current user's profile (REQ-017). Scope comes from the verified session only. */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const session = await authenticateTelegramRequest(request);
    return jsonOk({ profile: toProfileSummary(session.user, session.identity) });
  });
}

export async function PATCH(request: Request) {
  return handleRoute(async () => {
    const session = await authenticateTelegramRequest(request);
    const body = await readJsonBody(request);

    const repository = new PrismaProfileRepository(getPrisma());
    const updated = await updateProfile(repository, session.user.id, body);

    return jsonOk({ profile: toProfileSummary(updated, session.identity) });
  });
}
