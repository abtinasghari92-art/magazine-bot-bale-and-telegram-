import { NotFoundError } from "@/lib/errors";
import { parseWithSchema } from "@/lib/validation";
import type { UserIdentityRecord, UserRecord } from "@/modules/identity/types";

import type { ProfileRepository } from "./repository";
import { profileUpdateSchema } from "./schema";

export type ProfileSummary = {
  userId: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  phoneVerified: boolean;
  /** True when checkout has everything REQ-017 requires. */
  isComplete: boolean;
  telegram: {
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    languageCode: string | null;
  } | null;
};

export function toProfileSummary(
  user: UserRecord,
  identity?: UserIdentityRecord | null,
): ProfileSummary {
  return {
    userId: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    phoneVerified: user.phoneVerifiedAt !== null,
    isComplete: Boolean(user.firstName && user.lastName && user.phone),
    telegram: identity
      ? {
          username: identity.username,
          firstName: identity.firstName,
          lastName: identity.lastName,
          languageCode: identity.languageCode,
        }
      : null,
  };
}

/**
 * Update the caller's own profile. `userId` always comes from a verified
 * messenger session, never from the request body.
 */
export async function updateProfile(
  repository: ProfileRepository,
  userId: string,
  input: unknown,
): Promise<UserRecord> {
  const parsed = parseWithSchema(profileUpdateSchema, input);

  const current = await repository.findUserById(userId);
  if (!current) {
    throw new NotFoundError("حساب کاربری یافت نشد.", `user ${userId} not found`);
  }

  const phone = parsed.phone ?? null;
  // Changing the number invalidates any previous verification (REQ-018).
  const phoneVerifiedAt = phone && phone === current.phone ? current.phoneVerifiedAt : null;

  return repository.updateProfile(userId, {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    phone,
    phoneVerifiedAt,
  });
}
