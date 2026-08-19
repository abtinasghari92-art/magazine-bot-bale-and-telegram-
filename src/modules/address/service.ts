import { NotFoundError } from "@/lib/errors";
import { FieldValidationError } from "@/lib/validation";

import type { AddressRepository } from "./repository";
import type { AddressRecord } from "./types";
import type { AddressValidator } from "./validation";

/** Hard cap so a single account cannot fill the table. */
export const MAX_ACTIVE_ADDRESSES = 20;

type Payload = {
  fields: unknown;
  makeDefault: boolean | undefined;
};

function splitPayload(body: unknown): Payload {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { fields: body, makeDefault: undefined };
  }
  const { isDefault, ...fields } = body as Record<string, unknown>;
  return {
    fields,
    makeDefault: typeof isDefault === "boolean" ? isDefault : undefined,
  };
}

/**
 * Load an address and prove the caller owns it.
 *
 * Someone else's address reports as "not found" rather than "forbidden" so the
 * API never confirms that an id exists for another account.
 */
async function requireOwnAddress(
  repository: AddressRepository,
  userId: string,
  addressId: string,
): Promise<AddressRecord> {
  const address = await repository.findById(addressId);
  if (!address || address.userId !== userId || !address.isActive) {
    throw new NotFoundError(
      "نشانی یافت نشد.",
      `address ${addressId} is not an active address of user ${userId}`,
    );
  }
  return address;
}

export async function listAddresses(
  repository: AddressRepository,
  userId: string,
): Promise<AddressRecord[]> {
  return repository.listActiveByUser(userId);
}

export async function getAddress(
  repository: AddressRepository,
  userId: string,
  addressId: string,
): Promise<AddressRecord> {
  return requireOwnAddress(repository, userId, addressId);
}

export async function createAddress(
  repository: AddressRepository,
  validator: AddressValidator,
  userId: string,
  body: unknown,
): Promise<AddressRecord> {
  const { fields, makeDefault } = splitPayload(body);
  const validated = await validator.validate(fields);
  if (!validated.ok) {
    throw new FieldValidationError(validated.issues);
  }

  const activeCount = await repository.countActiveByUser(userId);
  if (activeCount >= MAX_ACTIVE_ADDRESSES) {
    throw new FieldValidationError([
      {
        field: "address",
        message: `حداکثر ${MAX_ACTIVE_ADDRESSES} نشانی فعال می‌توانید داشته باشید.`,
      },
    ]);
  }

  // The first address a user has is always their default.
  const shouldBeDefault = activeCount === 0 || makeDefault === true;

  return repository.transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.clearDefaultForUser(userId);
    }
    return tx.create(userId, validated.data, { isDefault: shouldBeDefault });
  });
}

export async function updateAddress(
  repository: AddressRepository,
  validator: AddressValidator,
  userId: string,
  addressId: string,
  body: unknown,
): Promise<AddressRecord> {
  const existing = await requireOwnAddress(repository, userId, addressId);

  const { fields, makeDefault } = splitPayload(body);
  const validated = await validator.validate(fields);
  if (!validated.ok) {
    throw new FieldValidationError(validated.issues);
  }

  return repository.transaction(async (tx) => {
    const updated = await tx.update(existing.id, validated.data);
    if (makeDefault === true && !updated.isDefault) {
      await tx.clearDefaultForUser(userId);
      return tx.markDefault(updated.id);
    }
    return updated;
  });
}

/**
 * Deactivate an address (REQ-021). Rows are kept so past orders keep pointing
 * at the address they shipped to; a removed default is handed to the most
 * recent remaining address.
 */
export async function deactivateAddress(
  repository: AddressRepository,
  userId: string,
  addressId: string,
  now: Date = new Date(),
): Promise<AddressRecord> {
  const existing = await requireOwnAddress(repository, userId, addressId);

  return repository.transaction(async (tx) => {
    const deactivated = await tx.deactivate(existing.id, now);
    if (existing.isDefault) {
      const candidate = await tx.findDefaultCandidate(userId, existing.id);
      if (candidate) {
        await tx.clearDefaultForUser(userId);
        await tx.markDefault(candidate.id);
      }
    }
    return deactivated;
  });
}

/** Exactly one active address per user carries `isDefault` (REQ-021). */
export async function setDefaultAddress(
  repository: AddressRepository,
  userId: string,
  addressId: string,
): Promise<AddressRecord> {
  const existing = await requireOwnAddress(repository, userId, addressId);

  return repository.transaction(async (tx) => {
    await tx.clearDefaultForUser(userId);
    return tx.markDefault(existing.id);
  });
}

export async function getDefaultAddress(
  repository: AddressRepository,
  userId: string,
): Promise<AddressRecord | null> {
  const addresses = await repository.listActiveByUser(userId);
  return addresses.find((address) => address.isDefault) ?? null;
}
