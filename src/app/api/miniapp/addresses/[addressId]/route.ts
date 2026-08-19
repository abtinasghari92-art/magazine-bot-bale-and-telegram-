import {
  deactivateAddress,
  getAddress,
  getAddressValidator,
  updateAddress,
} from "@/modules/address";
import { authenticateTelegramRequest } from "@/server/auth/telegram-session";
import { getPrisma } from "@/server/db";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";
import { toAddressDto } from "@/server/presenters";
import { PrismaAddressRepository } from "@/server/repositories/address-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ addressId: string }> };

function repository() {
  return new PrismaAddressRepository(getPrisma());
}

export async function GET(request: Request, context: RouteContext) {
  return handleRoute(async () => {
    const session = await authenticateTelegramRequest(request);
    const { addressId } = await context.params;
    const address = await getAddress(repository(), session.user.id, addressId);
    return jsonOk({ address: toAddressDto(address) });
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  return handleRoute(async () => {
    const session = await authenticateTelegramRequest(request);
    const { addressId } = await context.params;
    const address = await updateAddress(
      repository(),
      getAddressValidator(),
      session.user.id,
      addressId,
      await readJsonBody(request),
    );
    return jsonOk({ address: toAddressDto(address) });
  });
}

/** Deactivates instead of deleting so historical references stay intact. */
export async function DELETE(request: Request, context: RouteContext) {
  return handleRoute(async () => {
    const session = await authenticateTelegramRequest(request);
    const { addressId } = await context.params;
    await deactivateAddress(repository(), session.user.id, addressId);
    return jsonOk({ deactivated: true });
  });
}
