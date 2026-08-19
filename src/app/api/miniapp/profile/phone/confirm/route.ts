import { z } from "zod";

import { parseWithSchema } from "@/lib/validation";
import { toProfileSummary } from "@/modules/profile";
import { confirmPhoneVerification } from "@/modules/verification";
import { authenticateTelegramRequest } from "@/server/auth/telegram-session";
import { getPrisma } from "@/server/db";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";
import { PrismaProfileRepository } from "@/server/repositories/profile-repository";
import { getPhoneVerificationDeps } from "@/server/verification";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const bodySchema = z
  .object({
    phone: z.string().min(1, { message: "شماره موبایل الزامی است." }),
    code: z
      .string()
      .min(1, { message: "کد تأیید الزامی است." })
      .max(10, { message: "کد تأیید نامعتبر است." }),
  })
  .strict();

/** Confirm a mobile-verification code (REQ-018). */
export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await authenticateTelegramRequest(request);
    const { phone, code } = parseWithSchema(bodySchema, await readJsonBody(request));

    await confirmPhoneVerification(
      getPhoneVerificationDeps(),
      session.user.id,
      phone,
      code,
    );

    const repository = new PrismaProfileRepository(getPrisma());
    const user = await repository.findUserById(session.user.id);

    return jsonOk({
      profile: user ? toProfileSummary(user, session.identity) : null,
    });
  });
}
