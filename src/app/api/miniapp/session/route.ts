import { z } from "zod";

import { listAddresses } from "@/modules/address";
import { toProfileSummary } from "@/modules/profile";
import { authenticateTelegramRequest } from "@/server/auth/telegram-session";
import { getPrisma } from "@/server/db";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";
import { toAddressDto } from "@/server/presenters";
import { PrismaAddressRepository } from "@/server/repositories/address-repository";
import { isPhoneVerificationRequired } from "@/server/verification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z.object({
  /** Entry source for attribution (REQ-003); the start param comes from init data. */
  source: z.string().trim().max(128).optional().nullable(),
});

/**
 * Start a Mini App session (REQ-005 / REQ-016).
 * Telegram init data is verified server-side before any row is written.
 */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const body = bodySchema.safeParse(await readJsonBody(request));
    const source = body.success ? (body.data.source ?? null) : null;

    const session = await authenticateTelegramRequest(request, {
      recordEntry: true,
      source,
    });

    const addressRepository = new PrismaAddressRepository(getPrisma());
    const addresses = await listAddresses(addressRepository, session.user.id);

    return jsonOk({
      isNewUser: session.isNewUser,
      profile: toProfileSummary(session.user, session.identity),
      addresses: addresses.map(toAddressDto),
      settings: {
        phoneVerificationRequired: isPhoneVerificationRequired(),
      },
    });
  });
}
