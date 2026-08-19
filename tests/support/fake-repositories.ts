import type { AddressRepository } from "@/modules/address/repository";
import type { AddressData, AddressRecord } from "@/modules/address/types";
import type { MessengerChannel } from "@/modules/attribution/types";
import type { IdentityRepository } from "@/modules/identity/repository";
import type {
  EntrySessionInput,
  MessengerIdentityInput,
  UserIdentityRecord,
  UserRecord,
} from "@/modules/identity/types";
import type { ProfileRepository } from "@/modules/profile/repository";
import type { PhoneVerificationRepository } from "@/modules/verification/repository";
import type {
  PhoneVerificationRecord,
  PhoneVerificationStatus,
} from "@/modules/verification/types";

let sequence = 0;
function nextId(prefix: string): string {
  sequence += 1;
  return `${prefix}_${sequence}`;
}

/** Shared store so identity, profile and verification doubles see one user table. */
export class FakeStore {
  readonly users = new Map<string, UserRecord>();
  readonly identities = new Map<string, UserIdentityRecord>();
  readonly addresses = new Map<string, AddressRecord>();
  readonly verifications = new Map<string, PhoneVerificationRecord>();
  readonly entrySessions: EntrySessionInput[] = [];

  createUser(overrides: Partial<UserRecord> = {}): UserRecord {
    const now = new Date();
    const user: UserRecord = {
      id: nextId("user"),
      status: "ACTIVE",
      firstName: null,
      lastName: null,
      phone: null,
      phoneVerifiedAt: null,
      lastSeenAt: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
    this.users.set(user.id, user);
    return user;
  }
}

export class FakeIdentityRepository implements IdentityRepository {
  constructor(readonly store: FakeStore = new FakeStore()) {}

  async findIdentity(
    channel: MessengerChannel,
    messengerUserId: string,
  ): Promise<UserIdentityRecord | null> {
    for (const identity of this.store.identities.values()) {
      if (identity.channel === channel && identity.messengerUserId === messengerUserId) {
        return { ...identity };
      }
    }
    return null;
  }

  async findUserById(userId: string): Promise<UserRecord | null> {
    const user = this.store.users.get(userId);
    return user ? { ...user } : null;
  }

  async createUserWithIdentity(input: {
    identity: MessengerIdentityInput;
    profile: { firstName: string | null; lastName: string | null };
    seenAt: Date;
  }): Promise<{ user: UserRecord; identity: UserIdentityRecord }> {
    const user = this.store.createUser({
      firstName: input.profile.firstName,
      lastName: input.profile.lastName,
      lastSeenAt: input.seenAt,
    });

    const identity: UserIdentityRecord = {
      id: nextId("identity"),
      userId: user.id,
      channel: input.identity.channel,
      messengerUserId: input.identity.messengerUserId,
      username: input.identity.username ?? null,
      firstName: input.identity.firstName ?? null,
      lastName: input.identity.lastName ?? null,
      languageCode: input.identity.languageCode ?? null,
      startParam: input.identity.startParam ?? null,
      lastSeenAt: input.seenAt,
    };
    this.store.identities.set(identity.id, identity);

    return { user: { ...user }, identity: { ...identity } };
  }

  async updateIdentity(
    identityId: string,
    input: MessengerIdentityInput & { seenAt: Date },
  ): Promise<UserIdentityRecord> {
    const existing = this.store.identities.get(identityId);
    if (!existing) throw new Error(`identity ${identityId} not found`);

    const updated: UserIdentityRecord = {
      ...existing,
      username: input.username ?? null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      languageCode: input.languageCode ?? null,
      startParam: input.startParam ?? null,
      lastSeenAt: input.seenAt,
    };
    this.store.identities.set(identityId, updated);
    return { ...updated };
  }

  async touchUser(userId: string, seenAt: Date): Promise<UserRecord> {
    const user = this.store.users.get(userId);
    if (!user) throw new Error(`user ${userId} not found`);
    const updated = { ...user, lastSeenAt: seenAt, updatedAt: seenAt };
    this.store.users.set(userId, updated);
    return { ...updated };
  }

  async recordEntrySession(input: EntrySessionInput): Promise<void> {
    this.store.entrySessions.push(input);
  }
}

export class FakeProfileRepository implements ProfileRepository {
  constructor(readonly store: FakeStore) {}

  async findUserById(userId: string): Promise<UserRecord | null> {
    const user = this.store.users.get(userId);
    return user ? { ...user } : null;
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
    const user = this.store.users.get(userId);
    if (!user) throw new Error(`user ${userId} not found`);
    const updated: UserRecord = { ...user, ...data, updatedAt: new Date() };
    this.store.users.set(userId, updated);
    return { ...updated };
  }
}

export class FakeAddressRepository implements AddressRepository {
  constructor(readonly store: FakeStore) {}

  private all(): AddressRecord[] {
    return [...this.store.addresses.values()];
  }

  async listActiveByUser(userId: string): Promise<AddressRecord[]> {
    return this.all()
      .filter((address) => address.userId === userId && address.isActive)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .map((address) => ({ ...address }));
  }

  async findById(addressId: string): Promise<AddressRecord | null> {
    const address = this.store.addresses.get(addressId);
    return address ? { ...address } : null;
  }

  async countActiveByUser(userId: string): Promise<number> {
    return this.all().filter((address) => address.userId === userId && address.isActive)
      .length;
  }

  async create(
    userId: string,
    data: AddressData,
    options: { isDefault: boolean },
  ): Promise<AddressRecord> {
    const now = new Date();
    const address: AddressRecord = {
      id: nextId("address"),
      userId,
      ...data,
      isDefault: options.isDefault,
      isActive: true,
      deactivatedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    this.store.addresses.set(address.id, address);
    return { ...address };
  }

  async update(addressId: string, data: AddressData): Promise<AddressRecord> {
    const existing = this.store.addresses.get(addressId);
    if (!existing) throw new Error(`address ${addressId} not found`);
    const updated: AddressRecord = { ...existing, ...data, updatedAt: new Date() };
    this.store.addresses.set(addressId, updated);
    return { ...updated };
  }

  async deactivate(addressId: string, deactivatedAt: Date): Promise<AddressRecord> {
    const existing = this.store.addresses.get(addressId);
    if (!existing) throw new Error(`address ${addressId} not found`);
    const updated: AddressRecord = {
      ...existing,
      isActive: false,
      isDefault: false,
      deactivatedAt,
      updatedAt: deactivatedAt,
    };
    this.store.addresses.set(addressId, updated);
    return { ...updated };
  }

  async clearDefaultForUser(userId: string): Promise<void> {
    for (const address of this.all()) {
      if (address.userId === userId && address.isDefault) {
        this.store.addresses.set(address.id, { ...address, isDefault: false });
      }
    }
  }

  async markDefault(addressId: string): Promise<AddressRecord> {
    const existing = this.store.addresses.get(addressId);
    if (!existing) throw new Error(`address ${addressId} not found`);
    const updated: AddressRecord = { ...existing, isDefault: true };
    this.store.addresses.set(addressId, updated);
    return { ...updated };
  }

  async findDefaultCandidate(
    userId: string,
    excludeAddressId: string,
  ): Promise<AddressRecord | null> {
    const candidates = this.all()
      .filter(
        (address) =>
          address.userId === userId && address.isActive && address.id !== excludeAddressId,
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const first = candidates[0];
    return first ? { ...first } : null;
  }

  async transaction<T>(fn: (repository: AddressRepository) => Promise<T>): Promise<T> {
    return fn(this);
  }
}

export class FakePhoneVerificationRepository implements PhoneVerificationRepository {
  constructor(readonly store: FakeStore) {}

  async findLatestPending(
    userId: string,
    phone: string,
  ): Promise<PhoneVerificationRecord | null> {
    const candidates = [...this.store.verifications.values()]
      .filter(
        (record) =>
          record.userId === userId && record.phone === phone && record.status === "PENDING",
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const first = candidates[0];
    return first ? { ...first } : null;
  }

  async create(input: {
    userId: string;
    phone: string;
    codeHash: string;
    provider: string;
    expiresAt: Date;
    createdAt: Date;
  }): Promise<PhoneVerificationRecord> {
    const record: PhoneVerificationRecord = {
      id: nextId("verification"),
      userId: input.userId,
      phone: input.phone,
      codeHash: input.codeHash,
      provider: input.provider,
      status: "PENDING",
      attempts: 0,
      expiresAt: input.expiresAt,
      consumedAt: null,
      createdAt: input.createdAt,
    };
    this.store.verifications.set(record.id, record);
    return { ...record };
  }

  async expirePending(userId: string, phone: string, at: Date): Promise<void> {
    for (const record of this.store.verifications.values()) {
      if (record.userId === userId && record.phone === phone && record.status === "PENDING") {
        this.store.verifications.set(record.id, {
          ...record,
          status: "EXPIRED",
          consumedAt: at,
        });
      }
    }
  }

  async recordAttempt(
    verificationId: string,
    input: { attempts: number; status: PhoneVerificationStatus; consumedAt: Date | null },
  ): Promise<PhoneVerificationRecord> {
    const existing = this.store.verifications.get(verificationId);
    if (!existing) throw new Error(`verification ${verificationId} not found`);
    const updated: PhoneVerificationRecord = { ...existing, ...input };
    this.store.verifications.set(verificationId, updated);
    return { ...updated };
  }

  async markUserPhoneVerified(
    userId: string,
    phone: string,
    verifiedAt: Date,
  ): Promise<void> {
    const user = this.store.users.get(userId);
    if (!user) throw new Error(`user ${userId} not found`);
    this.store.users.set(userId, { ...user, phone, phoneVerifiedAt: verifiedAt });
  }
}
