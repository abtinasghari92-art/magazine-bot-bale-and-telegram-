import "server-only";

import { getTelegramConfig } from "@/lib/env";
import { UnauthorizedError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import {
  resolveMessengerUser,
  toMessengerIdentityInput,
  type ResolvedIdentity,
} from "@/modules/identity";
import { verifyTelegramInitData } from "@/modules/telegram";
import type { InitDataVerificationMethod, VerifiedInitData } from "@/modules/telegram/types";
import { getPrisma } from "@/server/db";
import { PrismaIdentityRepository } from "@/server/repositories/identity-repository";

/** Header the Mini App uses to present raw Telegram init data. */
export const INIT_DATA_HEADER = "x-telegram-init-data";
/** `Authorization: tma <initData>` is the scheme Telegram documents for Mini Apps. */
const AUTH_SCHEME = "tma";

export type TelegramSession = ResolvedIdentity & {
  telegram: VerifiedInitData;
  method: InitDataVerificationMethod;
};

/**
 * Where a route is willing to read init data from.
 *
 * `allowQueryParam` exists for responses the browser fetches as a *document*
 * rather than through `fetch` — an `<img src>` cover, or a preview PDF opened
 * in a new tab. Neither can carry an `Authorization` header. It stays opt-in
 * and off by default: init data in a URL can reach a referrer header or an
 * access log, so JSON endpoints keep requiring the header.
 *
 * The string is still only a claim — `verifyTelegramInitData` checks its HMAC
 * and its age either way, so a copied URL stops working when the data expires.
 */
export type InitDataSourceOptions = {
  allowQueryParam?: boolean;
};

/**
 * Read raw init data off the request. The string is untrusted until
 * `verifyTelegramInitData` has checked its HMAC.
 */
export function readInitData(
  request: Request,
  options: InitDataSourceOptions = {},
): string | null {
  const authorization = request.headers.get("authorization");
  if (authorization) {
    const separator = authorization.indexOf(" ");
    if (separator > 0) {
      const scheme = authorization.slice(0, separator).toLowerCase();
      const value = authorization.slice(separator + 1).trim();
      if (scheme === AUTH_SCHEME && value.length > 0) {
        return value;
      }
    }
  }

  const header = request.headers.get(INIT_DATA_HEADER)?.trim();
  if (header && header.length > 0) return header;

  if (options.allowQueryParam) {
    const fromQuery = new URL(request.url).searchParams.get("initData")?.trim();
    if (fromQuery) return fromQuery;
  }

  return null;
}

/** Verify init data or fail with a 401 that says nothing about why. */
export function verifyRequestInitData(
  request: Request,
  options: InitDataSourceOptions = {},
): VerifiedInitData {
  const config = getTelegramConfig();
  const result = verifyTelegramInitData(readInitData(request, options), {
    botToken: config.botToken,
    maxAgeSeconds: config.maxAgeSeconds,
    allowUnsigned: config.devAuthEnabled,
  });

  if (!result.ok) {
    // Reason is for operators only; the client just sees "unauthorized".
    logger.warn("Telegram init data rejected", { reason: result.reason });
    throw new UnauthorizedError(`init data rejected: ${result.reason}`);
  }

  if (result.data.method === "development-bypass") {
    logger.warn("Telegram init data accepted without a signature (development only)", {
      messengerUserId: result.data.user.id,
    });
  }

  return result.data;
}

/**
 * Authenticate a Mini App request and resolve the platform user (REQ-005 /
 * REQ-016). Every user-scoped route goes through here — a user id in the
 * request body is never an authorization signal.
 */
export async function authenticateTelegramRequest(
  request: Request,
  options: { recordEntry?: boolean; source?: string | null } = {},
): Promise<TelegramSession> {
  const telegram = verifyRequestInitData(request);
  const repository = new PrismaIdentityRepository(getPrisma());

  const resolved = await resolveMessengerUser(
    repository,
    toMessengerIdentityInput(telegram),
    { recordEntry: options.recordEntry, source: options.source ?? null },
  );

  return { ...resolved, telegram, method: telegram.method };
}
