export type ProfileDto = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneVerified: boolean;
  isComplete: boolean;
  telegram: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    languageCode: string | null;
  } | null;
};

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

export type SessionDto = {
  isNewUser: boolean;
  profile: ProfileDto;
  addresses: AddressDto[];
  settings: { phoneVerificationRequired: boolean };
};
