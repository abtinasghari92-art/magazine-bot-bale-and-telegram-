import { describe, expect, it } from "vitest";

import { verifyTelegramInitData } from "@/modules/telegram";

import { buildSignedInitData, tamperInitData } from "./support/init-data";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN-do-not-use";
const USER = { id: 555_000_111, first_name: "ابتین", username: "abtin", language_code: "fa" };

describe("verifyTelegramInitData", () => {
  it("accepts init data signed with the bot token", () => {
    const initData = buildSignedInitData({
      botToken: BOT_TOKEN,
      user: USER,
      startParam: "campaign-42",
    });

    const result = verifyTelegramInitData(initData, {
      botToken: BOT_TOKEN,
      maxAgeSeconds: 3600,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.method).toBe("hmac-sha256");
    expect(result.data.user.id).toBe("555000111");
    expect(result.data.user.username).toBe("abtin");
    expect(result.data.user.languageCode).toBe("fa");
    expect(result.data.startParam).toBe("campaign-42");
  });

  it("rejects init data whose user object was swapped after signing", () => {
    const initData = buildSignedInitData({ botToken: BOT_TOKEN, user: USER });
    const tampered = tamperInitData(initData, (params) => {
      params.set("user", JSON.stringify({ ...USER, id: 999_999_999 }));
    });

    const result = verifyTelegramInitData(tampered, {
      botToken: BOT_TOKEN,
      maxAgeSeconds: 3600,
    });

    expect(result).toMatchObject({ ok: false, reason: "bad_signature" });
  });

  it("rejects a forged hash", () => {
    const initData = buildSignedInitData({ botToken: BOT_TOKEN, user: USER });
    const forged = tamperInitData(initData, (params) => {
      params.set("hash", "0".repeat(64));
    });

    expect(
      verifyTelegramInitData(forged, { botToken: BOT_TOKEN, maxAgeSeconds: 3600 }),
    ).toMatchObject({ ok: false, reason: "bad_signature" });
  });

  it("rejects init data signed with a different bot token", () => {
    const initData = buildSignedInitData({ botToken: "999:OTHER-BOT", user: USER });

    expect(
      verifyTelegramInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 3600 }),
    ).toMatchObject({ ok: false, reason: "bad_signature" });
  });

  it("rejects init data with no hash at all", () => {
    const initData = buildSignedInitData({ botToken: BOT_TOKEN, user: USER, omitHash: true });

    expect(
      verifyTelegramInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 3600 }),
    ).toMatchObject({ ok: false, reason: "missing_hash" });
  });

  it("rejects init data older than the configured window", () => {
    const authDate = new Date(Date.now() - 7200 * 1000);
    const initData = buildSignedInitData({ botToken: BOT_TOKEN, user: USER, authDate });

    expect(
      verifyTelegramInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 3600 }),
    ).toMatchObject({ ok: false, reason: "expired" });
  });

  it("accepts the same init data while it is still inside the window", () => {
    const authDate = new Date(Date.now() - 60 * 1000);
    const initData = buildSignedInitData({ botToken: BOT_TOKEN, user: USER, authDate });

    expect(
      verifyTelegramInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 3600 }).ok,
    ).toBe(true);
  });

  it("rejects an auth_date far in the future", () => {
    const authDate = new Date(Date.now() + 3600 * 1000);
    const initData = buildSignedInitData({ botToken: BOT_TOKEN, user: USER, authDate });

    expect(
      verifyTelegramInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 86_400 }),
    ).toMatchObject({ ok: false, reason: "future_auth_date" });
  });

  it("rejects empty init data", () => {
    expect(
      verifyTelegramInitData("", { botToken: BOT_TOKEN, maxAgeSeconds: 3600 }),
    ).toMatchObject({ ok: false, reason: "missing" });
  });

  it("refuses to authenticate when no bot token is configured", () => {
    const initData = buildSignedInitData({ botToken: BOT_TOKEN, user: USER });

    expect(verifyTelegramInitData(initData, { maxAgeSeconds: 3600 })).toMatchObject({
      ok: false,
      reason: "not_configured",
    });
  });

  it("still verifies the signature when a token exists even if unsigned data is allowed", () => {
    const initData = buildSignedInitData({ botToken: "999:OTHER-BOT", user: USER });

    expect(
      verifyTelegramInitData(initData, {
        botToken: BOT_TOKEN,
        maxAgeSeconds: 3600,
        allowUnsigned: true,
      }),
    ).toMatchObject({ ok: false, reason: "bad_signature" });
  });

  it("accepts unsigned init data only when explicitly allowed and no token exists", () => {
    const initData = buildSignedInitData({
      botToken: BOT_TOKEN,
      user: USER,
      omitHash: true,
    });

    const result = verifyTelegramInitData(initData, {
      maxAgeSeconds: 3600,
      allowUnsigned: true,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.method).toBe("development-bypass");
  });

  it("rejects init data without a usable user object", () => {
    const initData = buildSignedInitData({
      botToken: BOT_TOKEN,
      user: { id: 0 },
    });

    expect(
      verifyTelegramInitData(initData, { botToken: BOT_TOKEN, maxAgeSeconds: 3600 }),
    ).toMatchObject({ ok: false, reason: "missing_user" });
  });
});
