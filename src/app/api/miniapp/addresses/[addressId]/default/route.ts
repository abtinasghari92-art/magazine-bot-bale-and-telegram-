import { setDefaultAddress } from "@/modules/address";
import { authenticateTelegramRequest } from "@/server/auth/telegram-session";
import { getPrisma } from "@/server/db";
import { handleRoute, jsonOk } from "@/server/http";
import { toAddressDto } from "@/server/presenters";
import { PrismaAddressRepository } from "@/server/repositories/address-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ addressId: string }> };

/** Make one address the default; every other address of the user is cleared. */
export async function POST(request: Request, context: RouteContext) {
  return handleRoute(async () => {
    const session = await authenticateTelegramRequest(request);
    const { addressId } = await context.params;
    const address = await setDefaultAddress(
      new PrismaAddressRepository(getPrisma()),
      session.user.id,
      addressId,
    );
    return jsonOk({ address: toAddressDto(address) });
  });
}
