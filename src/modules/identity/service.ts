import { ForbiddenError } from "@/lib/errors";
import type { VerifiedInitData } from "@/modules/telegram/types";

import type { IdentityRepository } from "./repository";
import type {
  MessengerIdentityInput,
  ResolvedIdentity,
  UserIdentityRecord,
} from "./types";

/** Do not rewrite `lastSeenAt` more often than this on ordinary API calls. */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

function trimOrNull(value: string | null | undefined, max: number): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

/** Map verified Telegram init data onto the channel-agnostic identity shape. */
export function toMessengerIdentityInput(
  verified: VerifiedInitData,
): MessengerIdentityInput {
  return {
    channel: "TELEGRAM",
    messengerUserId: verified.user.id,
    username: trimOrNull(verified.user.username, 64),
    firstName: trimOrNull(verified.user.firstName, 64),
    lastName: trimOrNull(verified.user.lastName, 64),
    languageCode: trimOrNull(verified.user.languageCode, 16),
    startParam: trimOrNull(verified.startParam, 256),
  };
}

function messengerFieldsChanged(
  existing: UserIdentityRecord,
  next: MessengerIdentityInput,
): boolean {
  return (
    existing.username !== (next.username ?? null) ||
    existing.firstName !== (next.firstName ?? null) ||
    existing.lastName !== (next.lastName ?? null) ||
    existing.languageCode !== (next.languageCode ?? null) ||
    (next.startParam !== null &&
      next.startParam !== undefined &&
      existing.startParam !== next.startParam)
  );
}

export type ResolveOptions = {
  /** Entry source for attribution (REQ-003). */
  source?: string | null;
  /** Write an `EntrySession` row. Only true when a Mini App session starts. */
  recordEntry?: boolean;
  now?: Date;
};

/**
 * Find or create the platform user behind a verified messenger identity
 * (REQ-016). The same messenger id always resolves to the same `User`; only
 * messenger-supplied fields are refreshed on later opens, so profile edits made
 * by the user are never overwritten.
 */
export async function resolveMessengerUser(
  repository: IdentityRepository,
  input: MessengerIdentityInput,
  options: ResolveOptions = {},
): Promise<ResolvedIdentity> {
  const seenAt = options.now ?? new Date();
  const existing = await repository.findIdentity(input.channel, input.messengerUserId);

  if (!existing) {
    const created = await repository.createUserWithIdentity({
      identity: input,
      // Seed the editable profile from the messenger once, at creation time.
      profile: { firstName: input.firstName ?? null, lastName: input.lastName ?? null },
      seenAt,
    });

    await repository.recordEntrySession({
      userId: created.user.id,
      channel: input.channel,
      messengerUserId: input.messengerUserId,
      source: options.source ?? null,
      startParam: input.startParam ?? null,
    });

    return { user: created.user, identity: created.identity, isNewUser: true };
  }

  const user = await repository.findUserById(existing.userId);
  if (!user) {
    throw new ForbiddenError(`identity ${existing.id} points at a missing user`);
  }
  if (user.status !== "ACTIVE") {
    throw new ForbiddenError(`user ${user.id} is ${user.status}`);
  }

  const stale =
    !existing.lastSeenAt ||
    seenAt.getTime() - existing.lastSeenAt.getTime() > TOUCH_INTERVAL_MS;

  let identity = existing;
  let resolvedUser = user;

  if (options.recordEntry || stale || messengerFieldsChanged(existing, input)) {
    identity = await repository.updateIdentity(existing.id, {
      ...input,
      // Keep the original attribution when this open carries no start param.
      startParam: input.startParam ?? existing.startParam,
      seenAt,
    });
    resolvedUser = await repository.touchUser(user.id, seenAt);
  }

  if (options.recordEntry) {
    await repository.recordEntrySession({
      userId: user.id,
      channel: input.channel,
      messengerUserId: input.messengerUserId,
      source: options.source ?? null,
      startParam: input.startParam ?? null,
    });
  }

  return { user: resolvedUser, identity, isNewUser: false };
}
