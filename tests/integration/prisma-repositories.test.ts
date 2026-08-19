import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { NotFoundError } from "@/lib/errors";
import {
  createAddress,
  getAddressValidator,
  listAddresses,
  setDefaultAddress,
  updateAddress,
} from "@/modules/address";
import { resolveMessengerUser, toMessengerIdentityInput } from "@/modules/identity";
import { updateProfile } from "@/modules/profile";
import { verifyTelegramInitData } from "@/modules/telegram";
import type { VerifiedInitData } from "@/modules/telegram/types";
import { PrismaAddressRepository } from "@/server/repositories/address-repository";
import { PrismaIdentityRepository } from "@/server/repositories/identity-repository";
import { PrismaProfileRepository } from "@/server/repositories/profile-repository";

import { buildSignedInitData } from "../support/init-data";

/**
 * Runs the same rules as the unit tests against real PostgreSQL, so the Prisma
 * queries (transactions, ownership filters, unique identity) are covered too.
 *
 *   TEST_DATABASE_URL=postgresql://... npm test
 *
 * Point it at a throwaway database — the suite writes and deletes rows.
 */
const DATABASE_URL = process.env.TEST_DATABASE_URL;
const BOT_TOKEN = "123456:TEST-BOT-TOKEN-do-not-use";

function telegramInitData(id: number, startParam?: string): VerifiedInitData {
  const raw = buildSignedInitData({
    botToken: BOT_TOKEN,
    user: { id, first_name: "آزمون", language_code: "fa" },
    startParam,
  });
  const result = verifyTelegramInitData(raw, { botToken: BOT_TOKEN, maxAgeSeconds: 3600 });
  if (!result.ok) throw new Error(`fixture init data failed: ${result.reason}`);
  return result.data;
}

function addressPayload(overrides: Record<string, unknown> = {}) {
  return {
    recipientName: "ابتین کریمی",
    recipientMobile: "09121234567",
    province: "تهران",
    city: "تهران",
    addressLine: "خیابان ولیعصر، کوچه بهار، پلاک ۱۲، واحد ۳",
    postalCode: "1418973511",
    ...overrides,
  };
}

describe.skipIf(!DATABASE_URL)("Prisma repositories against PostgreSQL", () => {
  const prisma = new PrismaClient({
    datasources: { db: { url: DATABASE_URL ?? "" } },
  });

  // Telegram ids unique to this run so parallel runs do not collide.
  const base = 900_000_000 + Math.floor(Math.random() * 50_000_000);
  const ownerTelegramId = base;
  const otherTelegramId = base + 1;
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });

  async function resolveUser(telegramId: number, startParam?: string) {
    const repository = new PrismaIdentityRepository(prisma);
    const resolved = await resolveMessengerUser(
      repository,
      toMessengerIdentityInput(telegramInitData(telegramId, startParam)),
      { recordEntry: true, source: "integration-test" },
    );
    if (!createdUserIds.includes(resolved.user.id)) createdUserIds.push(resolved.user.id);
    return resolved;
  }

  it("returns the same user for the same Telegram identity", async () => {
    const first = await resolveUser(ownerTelegramId, "camp-1");
    const second = await resolveUser(ownerTelegramId);

    expect(first.isNewUser).toBe(true);
    expect(second.isNewUser).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    expect(second.identity.startParam).toBe("camp-1");

    const identityCount = await prisma.userIdentity.count({
      where: { channel: "TELEGRAM", messengerUserId: String(ownerTelegramId) },
    });
    expect(identityCount).toBe(1);
  });

  it("persists a profile update", async () => {
    const { user } = await resolveUser(ownerTelegramId);
    const repository = new PrismaProfileRepository(prisma);

    await updateProfile(repository, user.id, {
      firstName: "نگار",
      lastName: "احمدی",
      phone: "۰۹۱۲۱۲۳۴۵۶۷",
    });

    const reloaded = await prisma.user.findUnique({ where: { id: user.id } });
    expect(reloaded?.firstName).toBe("نگار");
    expect(reloaded?.phone).toBe("09121234567");
    expect(reloaded?.phoneVerifiedAt).toBeNull();
  });

  it("keeps exactly one default address per user", async () => {
    const { user } = await resolveUser(ownerTelegramId);
    const repository = new PrismaAddressRepository(prisma);
    const validator = getAddressValidator();

    const first = await createAddress(repository, validator, user.id, addressPayload());
    const second = await createAddress(
      repository,
      validator,
      user.id,
      addressPayload({ city: "کرج", province: "البرز" }),
    );

    expect(first.isDefault).toBe(true);

    await setDefaultAddress(repository, user.id, second.id);

    const defaults = await prisma.address.count({
      where: { userId: user.id, isActive: true, isDefault: true },
    });
    expect(defaults).toBe(1);

    const addresses = await listAddresses(repository, user.id);
    expect(addresses.find((address) => address.isDefault)?.id).toBe(second.id);
  });

  it("refuses to touch another user's address", async () => {
    const owner = await resolveUser(ownerTelegramId);
    const other = await resolveUser(otherTelegramId);
    const repository = new PrismaAddressRepository(prisma);
    const validator = getAddressValidator();

    const address = await createAddress(
      repository,
      validator,
      owner.user.id,
      addressPayload({ city: "شیراز", province: "فارس" }),
    );

    await expect(
      updateAddress(
        repository,
        validator,
        other.user.id,
        address.id,
        addressPayload({ city: "رشت", province: "گیلان" }),
      ),
    ).rejects.toBeInstanceOf(NotFoundError);

    const untouched = await prisma.address.findUnique({ where: { id: address.id } });
    expect(untouched?.city).toBe("شیراز");
    expect(await listAddresses(repository, other.user.id)).toHaveLength(0);
  });
});
