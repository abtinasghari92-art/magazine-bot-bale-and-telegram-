import "server-only";

import type { MessengerChannel } from "@/modules/attribution/types";
import type { IdentityRepository } from "@/modules/identity/repository";
import type {
  EntrySessionInput,
  MessengerIdentityInput,
  UserIdentityRecord,
  UserRecord,
} from "@/modules/identity/types";

import type { PrismaLike } from "./types";

type UserRow = {
  id: string;
  status: "ACTIVE" | "DISABLED";
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneVerifiedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type IdentityRow = {
  id: string;
  userId: string;
  channel: MessengerChannel;
  messengerUserId: string;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  languageCode: string | null;
  startParam: string | null;
  lastSeenAt: Date | null;
};

export function toUserRecord(row: UserRow): UserRecord {
  return {
    id: row.id,
    status: row.status,
    firstName: row.firstName,
    lastName: row.lastName,
    phone: row.phone,
    phoneVerifiedAt: row.phoneVerifiedAt,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toIdentityRecord(row: IdentityRow): UserIdentityRecord {
  return {
    id: row.id,
    userId: row.userId,
    channel: row.channel,
    messengerUserId: row.messengerUserId,
    username: row.username,
    firstName: row.firstName,
    lastName: row.lastName,
    languageCode: row.languageCode,
    startParam: row.startParam,
    lastSeenAt: row.lastSeenAt,
  };
}

export class PrismaIdentityRepository implements IdentityRepository {
  constructor(private readonly db: PrismaLike) {}

  async findIdentity(
    channel: MessengerChannel,
    messengerUserId: string,
  ): Promise<UserIdentityRecord | null> {
    const row = await this.db.userIdentity.findUnique({
      where: { channel_messengerUserId: { channel, messengerUserId } },
    });
    return row ? toIdentityRecord(row) : null;
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    const row = await this.db.user.findUnique({ where: { id: userId } });
    return row ? toUserRecord(row) : null;
  }

  async createUserWithIdentity(input: {
    identity: MessengerIdentityInput;
    profile: { firstName: string | null; lastName: string | null };
    seenAt: Date;
  }): Promise<{ user: UserRecord; identity: UserIdentityRecord }> {
    const row = await this.db.user.create({
      data: {
        firstName: input.profile.firstName,
        lastName: input.profile.lastName,
        lastSeenAt: input.seenAt,
        identities: {
          create: {
            channel: input.identity.channel,
            messengerUserId: input.identity.messengerUserId,
            username: input.identity.username ?? null,
            firstName: input.identity.firstName ?? null,
            lastName: input.identity.lastName ?? null,
            languageCode: input.identity.languageCode ?? null,
            startParam: input.identity.startParam ?? null,
            lastSeenAt: input.seenAt,
          },
        },
      },
      include: { identities: true },
    });

    const identity = row.identities[0];
    if (!identity) {
      throw new Error("user was created without an identity row");
    }

    return { user: toUserRecord(row), identity: toIdentityRecord(identity) };
  }

  async updateIdentity(
    identityId: string,
    input: MessengerIdentityInput & { seenAt: Date },
  ): Promise<UserIdentityRecord> {
    const row = await this.db.userIdentity.update({
      where: { id: identityId },
      data: {
        username: input.username ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        languageCode: input.languageCode ?? null,
        startParam: input.startParam ?? null,
        lastSeenAt: input.seenAt,
      },
    });
    return toIdentityRecord(row);
  }

  async touchUser(userId: string, seenAt: Date): Promise<UserRecord> {
    const row = await this.db.user.update({
      where: { id: userId },
      data: { lastSeenAt: seenAt },
    });
    return toUserRecord(row);
  }

  async recordEntrySession(input: EntrySessionInput): Promise<void> {
    await this.db.entrySession.create({
      data: {
        userId: input.userId,
        channel: input.channel,
        messengerUserId: input.messengerUserId,
        source: input.source ?? null,
        startParam: input.startParam ?? null,
      },
    });
  }
}
