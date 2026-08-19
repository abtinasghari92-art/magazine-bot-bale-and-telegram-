import { createAddress, getAddressValidator, listAddresses } from "@/modules/address";
import { authenticateTelegramRequest } from "@/server/auth/telegram-session";
import { getPrisma } from "@/server/db";
import { handleRoute, jsonOk, readJsonBody } from "@/server/http";
import { toAddressDto } from "@/server/presenters";
import { PrismaAddressRepository } from "@/server/repositories/address-repository";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function repository() {
  return new PrismaAddressRepository(getPrisma());
}

/** Addresses of the authenticated user only (REQ-021). */
export async function GET(request: Request) {
  return handleRoute(async () => {
    const session = await authenticateTelegramRequest(request);
    const addresses = await listAddresses(repository(), session.user.id);
    return jsonOk({ addresses: addresses.map(toAddressDto) });
  });
}

export async function POST(request: Request) {
  return handleRoute(async () => {
    const session = await authenticateTelegramRequest(request);
    const address = await createAddress(
      repository(),
      getAddressValidator(),
      session.user.id,
      await readJsonBody(request),
    );
    return jsonOk({ address: toAddressDto(address) }, 201);
  });
}
