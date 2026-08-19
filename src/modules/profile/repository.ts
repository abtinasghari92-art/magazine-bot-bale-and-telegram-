import type { UserRecord } from "@/modules/identity/types";

/** Persistence port for the editable part of a user (REQ-017). */
export interface ProfileRepository {
  findUserById(userId: string): Promise<UserRecord | null>;

  updateProfile(
    userId: string,
    data: {
      firstName: string;
      lastName: string;
      phone: string | null;
      phoneVerifiedAt: Date | null;
    },
  ): Promise<UserRecord>;
}
