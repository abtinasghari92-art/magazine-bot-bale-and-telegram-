import { z } from "zod";

import { parseWithSchema } from "@/lib/validation";
import { requestPhoneVerification } from "@/modules/verification";
import { authenticateTelegramRequest } from "@/server/auth/telegram-session";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";
import { getPhoneVerificationDeps } from "@/server/verification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z
  .object({ phone: z.string().min(1, { message: "شماره موبایل الزامی است." }) })
  .strict();

/** Request a mobile-verification code (REQ-018). The code itself is never returned. */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await authenticateTelegramRequest(request);
    const { phone } = parseWithSchema(bodySchema, await readJsonBody(request));

    const result = await requestPhoneVerification(
      getPhoneVerificationDeps(),
      session.user.id,
      phone,
    );

    return jsonOk({
      provider: result.provider,
      codeLength: result.codeLength,
      expiresAt: result.expiresAt.toISOString(),
      resendAvailableAt: result.resendAvailableAt.toISOString(),
    });
  });
}
