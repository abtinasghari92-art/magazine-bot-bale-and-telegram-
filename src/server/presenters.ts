import "server-only";

import type { AddressRecord } from "@/modules/address/types";
import type { ProfileSummary } from "@/modules/profile";

export type AddressDto = {
  id: string;
  label: string | null;
  recipientName: string;
  recipientMobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toAddressDto(address: AddressRecord): AddressDto {
  return {
    id: address.id,
    label: address.label,
    recipientName: address.recipientName,
    recipientMobile: address.recipientMobile,
    province: address.province,
    city: address.city,
    addressLine: address.addressLine,
    postalCode: address.postalCode,
    isDefault: address.isDefault,
    createdAt: address.createdAt.toISOString(),
    updatedAt: address.updatedAt.toISOString(),
  };
}

export type ProfileDto = ProfileSummary;
