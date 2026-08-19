export {
  createAddress,
  deactivateAddress,
  getAddress,
  getDefaultAddress,
  listAddresses,
  MAX_ACTIVE_ADDRESSES,
  setDefaultAddress,
  updateAddress,
} from "./service";
export { addressInputSchema, setDefaultAddressSchema } from "./schema";
export {
  getAddressValidator,
  LocalAddressValidator,
  type AddressValidator,
} from "./validation";
export { canonicalizeProvince, IRAN_PROVINCES, isKnownProvince } from "./provinces";
export type { IranProvince } from "./provinces";
export type { AddressRepository } from "./repository";
export type {
  AddressData,
  AddressRecord,
  AddressValidationIssue,
  AddressValidationResult,
} from "./types";
