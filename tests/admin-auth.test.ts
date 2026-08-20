import { describe, expect, it } from "vitest";

import { AppError, RateLimitedError, UnauthorizedError } from "@/lib/errors";
import { ValidationError } from "@/lib/validation";
import {
  authenticateAdminToken,
  checkPasswordPolicy,
  hashPassword,
  hashSessionToken,
  loginAdmin,
  logoutAdmin,
  requireAdminToken,
  verifyPassword,
  type AdminAuthConfig,
} from "@/modules/admin";

import { FakeAdminRepository } from "./support/fake-admin";
import { captureAppError } from "./support/errors";

const CONFIG: AdminAuthConfig = {
  sessionTtlSeconds: 8 * 60 * 60,
  maxLoginAttempts: 5,
  loginWindowSeconds: 15 * 60,
};

const EMAIL = "editor@example.com";
const PASSWORD = "Correct-Horse-99";

async function seeded() {
  const repository = new FakeAdminRepository();
  const admin = await repository.seedAdmin({ email: EMAIL, password: PASSWORD });
  return { repository, admin };
}

describe("admin login (REQ-046)", () => {
  it("issues a session for correct credentials", async () => {
    const { repository, admin } = await seeded();

    const result = await loginAdmin(repository, CONFIG, { email: EMAIL, password: PASSWORD });

    expect(result.admin.id).toBe(admin.id);
    expect(result.token).toHaveLength(43); // 32 random bytes, base64url
    expect(result.session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("stores only the hash of the session token, never the token", async () => {
    const { repository } = await seeded();

    const { token, session } = await loginAdmin(repository, CONFIG, {
      email: EMAIL,
      password: PASSWORD,
    });

    expect(session.tokenHash).toBe(hashSessionToken(token));
    expect(session.tokenHash).not.toBe(token);
    // A database dump must not contain anything usable as a cookie.
    expect(JSON.stringify([...repository.sessions.values()])).not.toContain(token);
  });

  it("accepts the email case-insensitively", async () => {
    const { repository } = await seeded();

    const result = await loginAdmin(repository, CONFIG, {
      email: "  EDITOR@Example.COM ",
      password: PASSWORD,
    });

    expect(result.admin.email).toBe(EMAIL);
  });

  it("rejects a wrong password", async () => {
    const { repository } = await seeded();

    await expect(
      loginAdmin(repository, CONFIG, { email: EMAIL, password: "Wrong-Password-1" }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("gives an unknown email and a wrong password the same answer", async () => {
    const { repository } = await seeded();

    const unknown = await captureAppError(
      loginAdmin(repository, CONFIG, { email: "nobody@example.com", password: PASSWORD }),
    );
    const wrong = await captureAppError(
      loginAdmin(repository, CONFIG, { email: EMAIL, password: "Wrong-Password-1" }),
    );

    // Login must not confirm which admin emails exist.
    expect(unknown.publicMessage).toBe(wrong.publicMessage);
    expect(unknown.status).toBe(wrong.status);
  });

  it("refuses a disabled account", async () => {
    const repository = new FakeAdminRepository();
    await repository.seedAdmin({ email: EMAIL, password: PASSWORD, status: "DISABLED" });

    await expect(
      loginAdmin(repository, CONFIG, { email: EMAIL, password: PASSWORD }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("refuses an account that has no password set", async () => {
    const repository = new FakeAdminRepository();
    const admin = await repository.seedAdmin({ email: EMAIL, password: PASSWORD });
    repository.admins.set(admin.id, { ...admin, passwordHash: null });

    await expect(
      loginAdmin(repository, CONFIG, { email: EMAIL, password: PASSWORD }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("validates the login payload", async () => {
    const { repository } = await seeded();

    for (const payload of [
      {},
      { email: "not-an-email", password: PASSWORD },
      { email: EMAIL },
      { email: EMAIL, password: PASSWORD, role: "superadmin" },
    ]) {
      await expect(loginAdmin(repository, CONFIG, payload)).rejects.toBeInstanceOf(
        ValidationError,
      );
    }
  });
});

describe("brute-force protection (REQ-070)", () => {
  it("throttles after the configured number of failures", async () => {
    const { repository } = await seeded();

    for (let attempt = 0; attempt < CONFIG.maxLoginAttempts; attempt += 1) {
      await loginAdmin(repository, CONFIG, { email: EMAIL, password: "Wrong-Password-1" }).catch(
        () => undefined,
      );
    }

    // The correct password is refused too, so guessing cannot simply continue.
    await expect(
      loginAdmin(repository, CONFIG, { email: EMAIL, password: PASSWORD }),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("counts failures from one client address across different emails", async () => {
    const { repository } = await seeded();
    const context = { ipHash: "abc123" };

    for (let attempt = 0; attempt < CONFIG.maxLoginAttempts; attempt += 1) {
      await loginAdmin(
        repository,
        CONFIG,
        { email: `victim${attempt}@example.com`, password: "Wrong-Password-1" },
        context,
      ).catch(() => undefined);
    }

    await expect(
      loginAdmin(repository, CONFIG, { email: EMAIL, password: PASSWORD }, context),
    ).rejects.toBeInstanceOf(RateLimitedError);
  });

  it("lets attempts outside the window fall away", async () => {
    const { repository } = await seeded();
    const now = new Date();

    for (let attempt = 0; attempt < CONFIG.maxLoginAttempts; attempt += 1) {
      await loginAdmin(repository, CONFIG, { email: EMAIL, password: "Wrong-Password-1" }).catch(
        () => undefined,
      );
    }

    const later = new Date(now.getTime() + (CONFIG.loginWindowSeconds + 60) * 1000);
    const result = await loginAdmin(
      repository,
      CONFIG,
      { email: EMAIL, password: PASSWORD },
      {},
      later,
    );

    expect(result.admin.email).toBe(EMAIL);
  });

  it("never writes a password into the attempt ledger", async () => {
    const { repository } = await seeded();

    await loginAdmin(repository, CONFIG, { email: EMAIL, password: PASSWORD }).catch(
      () => undefined,
    );
    await loginAdmin(repository, CONFIG, { email: EMAIL, password: "Wrong-Password-1" }).catch(
      () => undefined,
    );

    expect(JSON.stringify(repository.attempts)).not.toContain(PASSWORD);
    expect(JSON.stringify(repository.attempts)).not.toContain("Wrong-Password-1");
  });
});

describe("admin session authorization (REQ-046)", () => {
  it("resolves a valid token to its admin", async () => {
    const { repository, admin } = await seeded();
    const { token } = await loginAdmin(repository, CONFIG, { email: EMAIL, password: PASSWORD });

    const authenticated = await authenticateAdminToken(repository, token);

    expect(authenticated?.admin.id).toBe(admin.id);
  });

  it("uses admin wording for a rejected session, not the Mini App's Telegram text", async () => {
    const { repository } = await seeded();

    const error = await captureAppError(requireAdminToken(repository, "no-such-token"));

    expect(error.status).toBe(401);
    // A staff user told their "Telegram login" is invalid would be misled.
    expect(error.publicMessage).not.toContain("تلگرام");
    expect(error.publicMessage).toContain("مدیریت");
  });

  it("rejects a missing, empty or malformed token", async () => {
    const { repository } = await seeded();

    for (const token of [null, undefined, "", "   ", "not-a-real-token", "../../etc/passwd"]) {
      expect(await authenticateAdminToken(repository, token)).toBeNull();
      await expect(requireAdminToken(repository, token)).rejects.toBeInstanceOf(
        UnauthorizedError,
      );
    }
  });

  it("rejects a token whose session has expired", async () => {
    const { repository } = await seeded();
    const { token } = await loginAdmin(repository, CONFIG, { email: EMAIL, password: PASSWORD });

    const afterExpiry = new Date(Date.now() + (CONFIG.sessionTtlSeconds + 60) * 1000);

    expect(await authenticateAdminToken(repository, token, afterExpiry)).toBeNull();
    await expect(requireAdminToken(repository, token, afterExpiry)).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
  });

  it("rejects a token after logout, even though the string is unchanged", async () => {
    const { repository } = await seeded();
    const { token } = await loginAdmin(repository, CONFIG, { email: EMAIL, password: PASSWORD });

    expect(await authenticateAdminToken(repository, token)).not.toBeNull();

    await logoutAdmin(repository, token);

    expect(await authenticateAdminToken(repository, token)).toBeNull();
  });

  it("rejects a session belonging to an account that was disabled", async () => {
    const { repository, admin } = await seeded();
    const { token } = await loginAdmin(repository, CONFIG, { email: EMAIL, password: PASSWORD });

    repository.admins.set(admin.id, { ...admin, status: "DISABLED" });

    expect(await authenticateAdminToken(repository, token)).toBeNull();
  });

  it("rejects a forged token that matches a real session's hash prefix", async () => {
    const { repository } = await seeded();
    const { token, session } = await loginAdmin(repository, CONFIG, {
      email: EMAIL,
      password: PASSWORD,
    });

    // Someone who saw the stored hash still cannot authenticate with it.
    expect(await authenticateAdminToken(repository, session.tokenHash)).toBeNull();
    expect(await authenticateAdminToken(repository, token.slice(0, -1))).toBeNull();
  });

  it("updates last-used so an operator can see a session is live", async () => {
    const { repository } = await seeded();
    const { token, session } = await loginAdmin(repository, CONFIG, {
      email: EMAIL,
      password: PASSWORD,
    });

    const later = new Date(Date.now() + 60_000);
    await authenticateAdminToken(repository, token, later);

    expect(repository.sessions.get(session.id)?.lastUsedAt.getTime()).toBe(later.getTime());
  });

  it("tolerates a logout with no session", async () => {
    const { repository } = await seeded();
    await expect(logoutAdmin(repository, null)).resolves.toBeUndefined();
    await expect(logoutAdmin(repository, "unknown-token")).resolves.toBeUndefined();
  });
});

describe("password hashing (REQ-046)", () => {
  it("produces a bcrypt hash that verifies", async () => {
    const hash = await hashPassword(PASSWORD);

    expect(hash.startsWith("$2")).toBe(true);
    expect(hash).not.toContain(PASSWORD);
    expect(await verifyPassword(PASSWORD, hash)).toBe(true);
    expect(await verifyPassword("Wrong-Password-1", hash)).toBe(false);
  });

  it("salts, so the same password hashes differently each time", async () => {
    expect(await hashPassword(PASSWORD)).not.toBe(await hashPassword(PASSWORD));
  });

  it("returns false rather than throwing for a missing or corrupt hash", async () => {
    expect(await verifyPassword(PASSWORD, null)).toBe(false);
    expect(await verifyPassword(PASSWORD, "")).toBe(false);
    expect(await verifyPassword(PASSWORD, "not-a-bcrypt-hash")).toBe(false);
  });

  it("refuses a weak bootstrap password", () => {
    for (const weak of ["short", "alllowercaseletters", "12345678901234", "password1234"]) {
      expect(checkPasswordPolicy(weak).ok).toBe(false);
    }
  });

  it("accepts a password that meets the policy", () => {
    expect(checkPasswordPolicy(PASSWORD).ok).toBe(true);
    expect(checkPasswordPolicy("a-Very-Long-Passphrase-9").ok).toBe(true);
  });
});
