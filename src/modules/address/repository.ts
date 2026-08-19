import type { AddressData, AddressRecord } from "./types";

/**
 * Persistence port for user addresses (REQ-021).
 *
 * `findById` deliberately does not filter by user: ownership is enforced once,
 * explicitly, in the service layer so the check is visible and testable.
 */
export interface AddressRepository {
  listActiveByUser(userId: string): Promise<AddressRecord[]>;

  findById(addressId: string): Promise<AddressRecord | null>;

  countActiveByUser(userId: string): Promise<number>;

  create(
    userId: string,
    data: AddressData,
    options: { isDefault: boolean },
  ): Promise<AddressRecord>;

  update(addressId: string, data: AddressData): Promise<AddressRecord>;

  deactivate(addressId: string, deactivatedAt: Date): Promise<AddressRecord>;

  /** Clear the default flag on every active address of a user. */
  clearDefaultForUser(userId: string): Promise<void>;

  markDefault(addressId: string): Promise<AddressRecord>;

  /** Most recent active address other than `excludeAddressId`, if any. */
  findDefaultCandidate(
    userId: string,
    excludeAddressId: string,
  ): Promise<AddressRecord | null>;

  /** Run the callback against a transactional repository. */
  transaction<T>(fn: (repository: AddressRepository) => Promise<T>): Promise<T>;
}
