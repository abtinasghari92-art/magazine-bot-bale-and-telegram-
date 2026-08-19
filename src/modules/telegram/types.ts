/** Telegram-supplied identity. Only trusted after `verifyTelegramInitData` succeeds. */
export type TelegramUser = {
  /** Telegram numeric user id, kept as a string so it never loses precision. */
  id: string;
  isBot: boolean;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  languageCode: string | null;
  isPremium: boolean;
};

export type InitDataVerificationMethod = "hmac-sha256" | "development-bypass";

export type VerifiedInitData = {
  user: TelegramUser;
  authDate: Date;
  /** Deep Link / `startapp` payload used for attribution (REQ-003). */
  startParam: string | null;
  chatType: string | null;
  chatInstance: string | null;
  queryId: string | null;
  method: InitDataVerificationMethod;
};

export type InitDataFailureReason =
  | "missing"
  | "malformed"
  | "missing_hash"
  | "bad_signature"
  | "missing_auth_date"
  | "expired"
  | "future_auth_date"
  | "missing_user"
  | "not_configured";

export type InitDataResult =
  | { ok: true; data: VerifiedInitData }
  | { ok: false; reason: InitDataFailureReason; message: string };

export type InitDataVerificationOptions = {
  /** Bot token. Server-side only — never ship this to the browser. */
  botToken?: string;
  /** Reject init data older than this many seconds. */
  maxAgeSeconds: number;
  /**
   * Accept unsigned init data. Only ever set from a development/test
   * environment where no bot token exists; ignored when a token is present.
   */
  allowUnsigned?: boolean;
  now?: Date;
};
