import type { MessengerChannel } from "@/modules/attribution/types";

export type UserStatus = "ACTIVE" | "DISABLED";

export type UserRecord = {
  id: string;
  status: UserStatus;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneVerifiedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserIdentityRecord = {
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

/** Messenger-supplied identity fields. Never user-editable. */
export type MessengerIdentityInput = {
  channel: MessengerChannel;
  messengerUserId: string;
  username?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  languageCode?: string | null;
  startParam?: string | null;
};

export type EntrySessionInput = {
  userId: string;
  channel: MessengerChannel;
  messengerUserId: string;
  source?: string | null;
  startParam?: string | null;
};

export type ResolvedIdentity = {
  user: UserRecord;
  identity: UserIdentityRecord;
  isNewUser: boolean;
};
