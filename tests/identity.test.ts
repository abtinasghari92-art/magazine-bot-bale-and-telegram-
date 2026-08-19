import { describe, expect, it } from "vitest";

import { resolveMessengerUser, toMessengerIdentityInput } from "@/modules/identity";
import { verifyTelegramInitData } from "@/modules/telegram";
import type { VerifiedInitData } from "@/modules/telegram/types";

import { FakeIdentityRepository, FakeStore } from "./support/fake-repositories";
import { buildSignedInitData } from "./support/init-data";

const BOT_TOKEN = "123456:TEST-BOT-TOKEN-do-not-use";

function verifiedInitData(overrides: {
  id: number;
  firstName?: string;
  username?: string;
  startParam?: string;
}): VerifiedInitData {
  const initData = buildSignedInitData({
    botToken: BOT_TOKEN,
    user: {
      id: overrides.id,
      first_name: overrides.firstName ?? "علی",
      username: overrides.username,
      language_code: "fa",
    },
    startParam: overrides.startParam,
  });

  const result = verifyTelegramInitData(initData, {
    botToken: BOT_TOKEN,
    maxAgeSeconds: 3600,
  });
  if (!result.ok) throw new Error(`fixture init data failed: ${result.reason}`);
  return result.data;
}

describe("resolveMessengerUser", () => {
  it("creates a user on first open and reuses it on every later open", async () => {
    const store = new FakeStore();
    const repository = new FakeIdentityRepository(store);
    const input = toMessengerIdentityInput(verifiedInitData({ id: 700_100_200 }));

    const first = await resolveMessengerUser(repository, input, { recordEntry: true });
    const second = await resolveMessengerUser(repository, input, { recordEntry: true });
    const third = await resolveMessengerUser(repository, input, { recordEntry: true });

    expect(first.isNewUser).toBe(true);
    expect(second.isNewUser).toBe(false);
    expect(third.isNewUser).toBe(false);
    expect(second.user.id).toBe(first.user.id);
    expect(third.user.id).toBe(first.user.id);
    expect(store.users.size).toBe(1);
    expect(store.identities.size).toBe(1);
  });

  it("keeps separate users for different Telegram ids", async () => {
    const repository = new FakeIdentityRepository();

    const one = await resolveMessengerUser(
      repository,
      toMessengerIdentityInput(verifiedInitData({ id: 1_000_001 })),
    );
    const two = await resolveMessengerUser(
      repository,
      toMessengerIdentityInput(verifiedInitData({ id: 1_000_002 })),
    );

    expect(one.user.id).not.toBe(two.user.id);
    expect(repository.store.users.size).toBe(2);
  });

  it("stores Telegram profile fields, language and start parameter", async () => {
    const repository = new FakeIdentityRepository();
    const input = toMessengerIdentityInput(
      verifiedInitData({ id: 42, firstName: "مریم", username: "maryam", startParam: "ref-7" }),
    );

    const resolved = await resolveMessengerUser(repository, input, {
      recordEntry: true,
      source: "bot-menu",
    });

    expect(resolved.identity.messengerUserId).toBe("42");
    expect(resolved.identity.username).toBe("maryam");
    expect(resolved.identity.firstName).toBe("مریم");
    expect(resolved.identity.languageCode).toBe("fa");
    expect(resolved.identity.startParam).toBe("ref-7");
    expect(resolved.identity.lastSeenAt).toBeInstanceOf(Date);
    expect(repository.store.entrySessions).toHaveLength(1);
    expect(repository.store.entrySessions[0]).toMatchObject({
      source: "bot-menu",
      startParam: "ref-7",
      channel: "TELEGRAM",
    });
  });

  it("seeds the editable profile from Telegram once and never overwrites edits", async () => {
    const store = new FakeStore();
    const repository = new FakeIdentityRepository(store);
    const input = toMessengerIdentityInput(verifiedInitData({ id: 99, firstName: "سارا" }));

    const created = await resolveMessengerUser(repository, input);
    expect(created.user.firstName).toBe("سارا");

    // The user edits their profile in the Mini App.
    const stored = store.users.get(created.user.id);
    if (!stored) throw new Error("user missing");
    store.users.set(created.user.id, { ...stored, firstName: "سارای دیگر" });

    const reopened = await resolveMessengerUser(repository, input);
    expect(reopened.user.firstName).toBe("سارای دیگر");
  });

  it("keeps the original start parameter when a later open has none", async () => {
    const repository = new FakeIdentityRepository();
    const withParam = toMessengerIdentityInput(
      verifiedInitData({ id: 321, startParam: "first-touch" }),
    );
    const withoutParam = toMessengerIdentityInput(verifiedInitData({ id: 321 }));

    await resolveMessengerUser(repository, withParam, { recordEntry: true });
    const reopened = await resolveMessengerUser(repository, withoutParam, {
      recordEntry: true,
    });

    expect(reopened.identity.startParam).toBe("first-touch");
  });

  it("only writes an entry session when a session actually starts", async () => {
    const repository = new FakeIdentityRepository();
    const input = toMessengerIdentityInput(verifiedInitData({ id: 555 }));

    await resolveMessengerUser(repository, input, { recordEntry: true });
    await resolveMessengerUser(repository, input);
    await resolveMessengerUser(repository, input);

    expect(repository.store.entrySessions).toHaveLength(1);
  });

  it("refuses a disabled user", async () => {
    const store = new FakeStore();
    const repository = new FakeIdentityRepository(store);
    const input = toMessengerIdentityInput(verifiedInitData({ id: 777 }));

    const created = await resolveMessengerUser(repository, input);
    const stored = store.users.get(created.user.id);
    if (!stored) throw new Error("user missing");
    store.users.set(created.user.id, { ...stored, status: "DISABLED" });

    await expect(resolveMessengerUser(repository, input)).rejects.toThrow();
  });
});
