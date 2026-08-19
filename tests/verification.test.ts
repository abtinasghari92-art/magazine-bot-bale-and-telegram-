import { describe, expect, it } from "vitest";

import { RateLimitedError, ServiceUnavailableError } from "@/lib/errors";
import { FieldValidationError } from "@/lib/validation";
import {
  confirmPhoneVerification,
  createPhoneVerificationProvider,
  LogPhoneVerificationProvider,
  requestPhoneVerification,
  UnconfiguredPhoneVerificationProvider,
  type PhoneVerificationDeps,
  type PhoneVerificationMessage,
} from "@/modules/verification";

import { FakePhoneVerificationRepository, FakeStore } from "./support/fake-repositories";

const CONFIG = {
  required: true,
  codeLength: 6,
  ttlSeconds: 180,
  maxAttempts: 3,
  resendIntervalSeconds: 60,
};

function setup() {
  const store = new FakeStore();
  const user = store.createUser();
  const sent: PhoneVerificationMessage[] = [];
  const deps: PhoneVerificationDeps = {
    repository: new FakePhoneVerificationRepository(store),
    provider: new LogPhoneVerificationProvider((message) => sent.push(message)),
    config: CONFIG,
  };
  return { store, user, sent, deps };
}

describe("phone verification provider selection", () => {
  it("defaults to a provider that refuses to send", () => {
    const provider = createPhoneVerificationProvider("none", "production");
    expect(provider).toBeInstanceOf(UnconfiguredPhoneVerificationProvider);
    expect(provider.canSend).toBe(false);
  });

  it("never builds the logging provider in production", () => {
    expect(() => createPhoneVerificationProvider("log", "production")).toThrow();
  });

  it("builds the logging provider for development", () => {
    const provider = createPhoneVerificationProvider("log", "development");
    expect(provider).toBeInstanceOf(LogPhoneVerificationProvider);
    expect(provider.canSend).toBe(true);
  });
});

describe("requestPhoneVerification", () => {
  it("sends a code and stores only its hash", async () => {
    const { deps, user, sent, store } = setup();

    const result = await requestPhoneVerification(deps, user.id, "۰۹۱۲۱۲۳۴۵۶۷");

    expect(sent).toHaveLength(1);
    expect(sent[0]?.phone).toBe("09121234567");
    expect(sent[0]?.code).toMatch(/^\d{6}$/);
    expect(result.codeLength).toBe(6);

    const stored = [...store.verifications.values()];
    expect(stored).toHaveLength(1);
    expect(stored[0]?.codeHash).not.toContain(sent[0]?.code ?? "");
  });

  it("rejects an invalid mobile number", async () => {
    const { deps, user } = setup();

    await expect(requestPhoneVerification(deps, user.id, "12345")).rejects.toBeInstanceOf(
      FieldValidationError,
    );
  });

  it("refuses to send when no provider is configured", async () => {
    const { deps, user } = setup();
    const blocked: PhoneVerificationDeps = {
      ...deps,
      provider: new UnconfiguredPhoneVerificationProvider(),
    };

    await expect(
      requestPhoneVerification(blocked, user.id, "09121234567"),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  it("throttles resends", async () => {
    const { deps, user } = setup();
    const now = new Date("2026-08-19T10:00:00Z");

    await requestPhoneVerification(deps, user.id, "09121234567", now);

    await expect(
      requestPhoneVerification(deps, user.id, "09121234567", new Date(now.getTime() + 5_000)),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("allows a resend after the interval and invalidates the old code", async () => {
    const { deps, user, sent } = setup();
    const now = new Date("2026-08-19T10:00:00Z");

    await requestPhoneVerification(deps, user.id, "09121234567", now);
    const firstCode = sent[0]?.code ?? "";

    const later = new Date(now.getTime() + 61_000);
    await requestPhoneVerification(deps, user.id, "09121234567", later);

    await expect(
      confirmPhoneVerification(deps, user.id, "09121234567", firstCode, later),
    ).rejects.toBeInstanceOf(FieldValidationError);
  });
});

describe("confirmPhoneVerification", () => {
  it("marks the number verified for the right code", async () => {
    const { deps, user, sent, store } = setup();
    const now = new Date("2026-08-19T10:00:00Z");

    await requestPhoneVerification(deps, user.id, "09121234567", now);
    const code = sent[0]?.code ?? "";

    const result = await confirmPhoneVerification(
      deps,
      user.id,
      "09121234567",
      code,
      new Date(now.getTime() + 10_000),
    );

    expect(result.phone).toBe("09121234567");
    expect(store.users.get(user.id)?.phone).toBe("09121234567");
    expect(store.users.get(user.id)?.phoneVerifiedAt).toBeInstanceOf(Date);
  });

  it("rejects a wrong code and leaves the number unverified", async () => {
    const { deps, user, sent, store } = setup();
    const now = new Date("2026-08-19T10:00:00Z");

    await requestPhoneVerification(deps, user.id, "09121234567", now);
    const wrong = sent[0]?.code === "000000" ? "111111" : "000000";

    await expect(
      confirmPhoneVerification(deps, user.id, "09121234567", wrong, now),
    ).rejects.toBeInstanceOf(FieldValidationError);

    expect(store.users.get(user.id)?.phoneVerifiedAt).toBeNull();
  });

  it("stops accepting attempts after the limit", async () => {
    const { deps, user, sent, store } = setup();
    const now = new Date("2026-08-19T10:00:00Z");

    await requestPhoneVerification(deps, user.id, "09121234567", now);
    const code = sent[0]?.code ?? "";
    const wrong = code === "000000" ? "111111" : "000000";

    for (let attempt = 0; attempt < CONFIG.maxAttempts; attempt += 1) {
      await expect(
        confirmPhoneVerification(deps, user.id, "09121234567", wrong, now),
      ).rejects.toBeInstanceOf(FieldValidationError);
    }

    // The record is closed, so even the right code no longer works.
    await expect(
      confirmPhoneVerification(deps, user.id, "09121234567", code, now),
    ).rejects.toBeInstanceOf(FieldValidationError);
    expect(store.users.get(user.id)?.phoneVerifiedAt).toBeNull();
  });

  it("rejects an expired code", async () => {
    const { deps, user, sent } = setup();
    const now = new Date("2026-08-19T10:00:00Z");

    await requestPhoneVerification(deps, user.id, "09121234567", now);
    const code = sent[0]?.code ?? "";

    await expect(
      confirmPhoneVerification(
        deps,
        user.id,
        "09121234567",
        code,
        new Date(now.getTime() + (CONFIG.ttlSeconds + 1) * 1000),
      ),
    ).rejects.toBeInstanceOf(FieldValidationError);
  });

  it("does not verify one user with another user's code", async () => {
    const { deps, store, user, sent } = setup();
    const other = store.createUser();
    const now = new Date("2026-08-19T10:00:00Z");

    await requestPhoneVerification(deps, user.id, "09121234567", now);
    const code = sent[0]?.code ?? "";

    await expect(
      confirmPhoneVerification(deps, other.id, "09121234567", code, now),
    ).rejects.toBeInstanceOf(FieldValidationError);
    expect(store.users.get(other.id)?.phoneVerifiedAt).toBeNull();
  });
});
