import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  InitDataFailureReason,
  InitDataResult,
  InitDataVerificationOptions,
  TelegramUser,
  VerifiedInitData,
} from "./types";

/** Telegram's fixed HMAC key label for Mini App init data. */
const SECRET_KEY_LABEL = "WebAppData";

/** Tolerated clock skew when init data looks newer than the server clock. */
const FUTURE_SKEW_SECONDS = 300;

function fail(reason: InitDataFailureReason, message: string): InitDataResult {
  return { ok: false, reason, message };
}

/**
 * Telegram's data-check-string: every received field except `hash`, sorted by
 * key, joined with newlines. `signature` (the Ed25519 third-party field) stays
 * in the string — it is part of what Telegram hashed.
 */
function buildDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key === "hash") continue;
    pairs.push(`${key}=${value}`);
  }
  return pairs.sort().join("\n");
}

function hexEquals(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  if (!/^[0-9a-f]+$/i.test(a) || !/^[0-9a-f]+$/i.test(b)) return false;
  return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function signInitData(dataCheckString: string, botToken: string): string {
  const secretKey = createHmac("sha256", SECRET_KEY_LABEL).update(botToken).digest();
  return createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
}

function optionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 256) : null;
}

function parseTelegramUser(rawUser: string | null): TelegramUser | null {
  if (!rawUser) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawUser);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const record = parsed as Record<string, unknown>;
  const rawId = record.id;
  const id =
    typeof rawId === "number" && Number.isInteger(rawId) && rawId > 0
      ? String(rawId)
      : typeof rawId === "string" && /^\d{1,20}$/.test(rawId)
        ? rawId
        : null;
  if (!id) return null;

  return {
    id,
    isBot: record.is_bot === true,
    firstName: optionalString(record.first_name),
    lastName: optionalString(record.last_name),
    username: optionalString(record.username),
    languageCode: optionalString(record.language_code)?.slice(0, 16) ?? null,
    isPremium: record.is_premium === true,
  };
}

/**
 * Verify Telegram Mini App init data server-side (REQ-005 / REQ-070).
 *
 * Nothing in the returned value is taken from the client until the HMAC over
 * the whole payload matches the bot token and `auth_date` is fresh, so a
 * tampered `user` field can never reach the database.
 */
export function verifyTelegramInitData(
  rawInitData: string | null | undefined,
  options: InitDataVerificationOptions,
): InitDataResult {
  const initData = rawInitData?.trim();
  if (!initData) {
    return fail("missing", "init data was not supplied");
  }

  let params: URLSearchParams;
  try {
    params = new URLSearchParams(initData);
  } catch {
    return fail("malformed", "init data is not a valid query string");
  }

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw || !/^\d{1,15}$/.test(authDateRaw)) {
    return fail("missing_auth_date", "auth_date is missing or not numeric");
  }
  const authDateSeconds = Number.parseInt(authDateRaw, 10);
  if (!Number.isFinite(authDateSeconds) || authDateSeconds <= 0) {
    return fail("missing_auth_date", "auth_date is not a valid timestamp");
  }

  const now = options.now ?? new Date();
  const nowSeconds = Math.floor(now.getTime() / 1000);
  const ageSeconds = nowSeconds - authDateSeconds;
  if (ageSeconds > options.maxAgeSeconds) {
    return fail("expired", `init data is ${ageSeconds}s old`);
  }
  if (ageSeconds < -FUTURE_SKEW_SECONDS) {
    return fail("future_auth_date", "auth_date is in the future");
  }

  const botToken = options.botToken?.trim();
  let method: VerifiedInitData["method"];

  if (botToken) {
    const hash = params.get("hash");
    if (!hash) {
      return fail("missing_hash", "hash is missing");
    }
    const expected = signInitData(buildDataCheckString(params), botToken);
    if (!hexEquals(hash, expected)) {
      return fail("bad_signature", "hash does not match the bot token");
    }
    method = "hmac-sha256";
  } else if (options.allowUnsigned) {
    // Development/test only: there is no token to verify against.
    method = "development-bypass";
  } else {
    return fail("not_configured", "TELEGRAM_BOT_TOKEN is not configured");
  }

  const user = parseTelegramUser(params.get("user"));
  if (!user) {
    return fail("missing_user", "init data does not carry a usable user object");
  }

  return {
    ok: true,
    data: {
      user,
      authDate: new Date(authDateSeconds * 1000),
      startParam: optionalString(params.get("start_param")),
      chatType: optionalString(params.get("chat_type")),
      chatInstance: optionalString(params.get("chat_instance")),
      queryId: optionalString(params.get("query_id")),
      method,
    },
  };
}

/**
 * Sign a data-check-string the way Telegram does. Exported so tests and local
 * tooling can build valid init data; production code only ever verifies.
 */
export function signTelegramDataCheckString(
  dataCheckString: string,
  botToken: string,
): string {
  return signInitData(dataCheckString, botToken);
}

export { buildDataCheckString };
