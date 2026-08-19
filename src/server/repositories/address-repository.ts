import "server-only";

import type { PrismaClient } from "@prisma/client";

import type { AddressRepository } from "@/modules/address/repository";
import type { AddressData, AddressRecord } from "@/modules/address/types";

import type { PrismaLike } from "./types";

type AddressRow = {
  id: string;
  userId: string;
  label: string | null;
  recipientName: string;
  recipientMobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
  isActive: boolean;
  deactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function toAddressRecord(row: AddressRow): AddressRecord {
  return {
    id: row.id,
    userId: row.userId,
    label: row.label,
    recipientName: row.recipientName,
    recipientMobile: row.recipientMobile,
    province: row.province,
    city: row.city,
    addressLine: row.addressLine,
    postalCode: row.postalCode,
    isDefault: row.isDefault,
    isActive: row.isActive,
    deactivatedAt: row.deactivatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAddressRepository implements AddressRepository {
  constructor(private readonly db: PrismaLike) {}

  async listActiveByUser(userId: string): Promise<AddressRecord[]> {
    const rows = await this.db.address.findMany({
      where: { userId, isActive: true },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toAddressRecord);
  }

  async findById(addressId: string): Promise<AddressRecord | null> {
    const row = await this.db.address.findUnique({ where: { id: addressId } });
    return row ? toAddressRecord(row) : null;
  }

  async countActiveByUser(userId: string): Promise<number> {
    return this.db.address.count({ where: { userId, isActive: true } });
  }

  async create(
    userId: string,
    data: AddressData,
    options: { isDefault: boolean },
  ): Promise<AddressRecord> {
    const row = await this.db.address.create({
      data: { ...data, userId, isDefault: options.isDefault },
    });
    return toAddressRecord(row);
  }

  async update(addressId: string, data: AddressData): Promise<AddressRecord> {
    const row = await this.db.address.update({ where: { id: addressId }, data });
    return toAddressRecord(row);
  }

  async deactivate(addressId: string, deactivatedAt: Date): Promise<AddressRecord> {
    const row = await this.db.address.update({
      where: { id: addressId },
      data: { isActive: false, isDefault: false, deactivatedAt },
    });
    return toAddressRecord(row);
  }

  async clearDefaultForUser(userId: string): Promise<void> {
    await this.db.address.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  async markDefault(addressId: string): Promise<AddressRecord> {
    const row = await this.db.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });
    return toAddressRecord(row);
  }

  async findDefaultCandidate(
    userId: string,
    excludeAddressId: string,
  ): Promise<AddressRecord | null> {
    const row = await this.db.address.findFirst({
      where: { userId, isActive: true, id: { not: excludeAddressId } },
      orderBy: { createdAt: "desc" },
    });
    return row ? toAddressRecord(row) : null;
  }

  async transaction<T>(fn: (repository: AddressRepository) => Promise<T>): Promise<T> {
    if (!("$transaction" in this.db)) {
      // Already inside a transaction client — reuse it.
      return fn(this);
    }
    return (this.db as PrismaClient).$transaction((tx) =>
      fn(new PrismaAddressRepository(tx)),
    );
  }
}
