import "server-only";

import type { UserRecord } from "@/modules/identity/types";
import type { ProfileRepository } from "@/modules/profile/repository";

import { toUserRecord } from "./identity-repository";
import type { PrismaLike } from "./types";

export class PrismaProfileRepository implements ProfileRepository {
  constructor(private readonly db: PrismaLike) {}

  async findUserById(userId: string): Promise<UserRecord | null> {
    const row = await this.db.user.findUnique({ where: { id: userId } });
    return row ? toUserRecord(row) : null;
  }

  async updateProfile(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      phone: string | null;
      phoneVerifiedAt: Date | null;
    },
  ): Promise<UserRecord> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        phoneVerifiedAt: data.phoneVerifiedAt,
      },
    });
    return toUserRecord(row);
  }
}
