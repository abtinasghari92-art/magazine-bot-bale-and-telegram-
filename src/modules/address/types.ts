export type AddressRecord = {
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

/** Validated, normalized address fields ready to persist. */
export type AddressData = {
  label: string | null;
  recipientName: string;
  recipientMobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
};

export type AddressValidationIssue = {
  field: keyof AddressData | "address";
  message: string;
};

export type AddressValidationResult =
  | { ok: true; data: AddressData }
  | { ok: false; issues: AddressValidationIssue[] };
