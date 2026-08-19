import type { MessengerChannel } from "@/modules/attribution/types";

import type {
  EntrySessionInput,
  MessengerIdentityInput,
  UserIdentityRecord,
  UserRecord,
} from "./types";

/**
 * Persistence port for platform users and their messenger identities.
 * Implemented over Prisma in `src/server/repositories`; tests use an in-memory
 * double so identity rules can be checked without a database.
 */
export interface IdentityRepository {
  findIdentity(
    channel: MessengerChannel,
    messengerUserId: string,
  ): Promise<UserIdentityRecord | null>;

  findUserById(userId: string): Promise<UserRecord | null>;

  /** Create the platform user and its first messenger identity together. */
  createUserWithIdentity(input: {
    identity: MessengerIdentityInput;
    profile: { firstName: string | null; lastName: string | null };
    seenAt: Date;
  }): Promise<{ user: UserRecord; identity: UserIdentityRecord }>;

  /** Refresh messenger-supplied fields and last-seen on an existing identity. */
  updateIdentity(
    identityId: string,
    input: MessengerIdentityInput & { seenAt: Date },
  ): Promise<UserIdentityRecord>;

  touchUser(userId: string, seenAt: Date): Promise<UserRecord>;

  recordEntrySession(input: EntrySessionInput): Promise<void>;
}
