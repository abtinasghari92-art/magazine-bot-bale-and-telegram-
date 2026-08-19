import { createHmac } from "node:crypto";

export type FakeTelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
};

export type BuildInitDataOptions = {
  botToken: string;
  user: FakeTelegramUser;
  authDate?: Date;
  startParam?: string;
  queryId?: string;
  /** Omit the hash entirely (simulates a stripped signature). */
  omitHash?: boolean;
};

/** Build init data signed exactly the way Telegram signs it. */
export function buildSignedInitData(options: BuildInitDataOptions): string {
  const authDate = Math.floor((options.authDate ?? new Date()).getTime() / 1000);

  const params = new URLSearchParams();
  params.set("user", JSON.stringify(options.user));
  params.set("auth_date", String(authDate));
  if (options.queryId) params.set("query_id", options.queryId);
  if (options.startParam) params.set("start_param", options.startParam);

  if (options.omitHash) {
    return params.toString();
  }

  const dataCheckString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(options.botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  params.set("hash", hash);
  return params.toString();
}

/** Change one field but keep the original hash, simulating tampering. */
export function tamperInitData(
  initData: string,
  mutate: (params: URLSearchParams) => void,
): string {
  const params = new URLSearchParams(initData);
  mutate(params);
  return params.toString();
}
