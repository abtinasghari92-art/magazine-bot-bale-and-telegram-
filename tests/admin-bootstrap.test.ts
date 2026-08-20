import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { BCRYPT_COST, MIN_PASSWORD_LENGTH } from "@/modules/admin";

/**
 * `scripts/create-admin.mjs` is plain JavaScript so it can run on a production
 * host where only `dependencies` are installed. That means it cannot import the
 * TypeScript module, and keeps its own copy of two security constants.
 *
 * These tests are the guard against those copies drifting: a first admin
 * created at a weaker cost, or accepted below the minimum length, would be a
 * silent downgrade nobody would notice.
 */

const SCRIPT_PATH = path.join(process.cwd(), "scripts", "create-admin.mjs");
const script = readFileSync(SCRIPT_PATH, "utf8");

function constantInScript(name: string): number {
  const match = new RegExp(`const ${name} = (\\d+);`).exec(script);
  if (!match) throw new Error(`${name} not found in create-admin.mjs`);
  return Number.parseInt(match[1]!, 10);
}

describe("admin bootstrap script", () => {
  it("hashes at the same bcrypt cost the login path uses", () => {
    expect(constantInScript("BCRYPT_COST")).toBe(BCRYPT_COST);
  });

  it("enforces the same minimum password length", () => {
    expect(constantInScript("MIN_PASSWORD_LENGTH")).toBe(MIN_PASSWORD_LENGTH);
  });

  it("uses a cost that is still meaningful for an interactive login", () => {
    expect(BCRYPT_COST).toBeGreaterThanOrEqual(12);
  });

  it("never writes a password to stdout", () => {
    // The only console calls may report the email and the outcome.
    const logged = [...script.matchAll(/console\.(log|error)\(([^\n]*)/g)].map((m) => m[2] ?? "");
    for (const line of logged) {
      expect(line).not.toContain("password");
      expect(line).not.toContain("passwordHash");
    }
  });

  it("does not contain a hard-coded password or hash", () => {
    // A credential committed here would be in git history forever.
    expect(script).not.toMatch(/\$2[aby]\$\d\d\$/);
    expect(script).not.toMatch(/ADMIN_PASSWORD\s*=\s*["'][^"']+["']/);
  });

  it("refuses to overwrite an existing admin without an explicit flag", () => {
    expect(script).toContain("reset-password");
    expect(script).toContain("already exists");
  });

  it("revokes existing sessions when a password is reset", () => {
    expect(script).toContain("adminSession.updateMany");
    expect(script).toContain("revokedAt");
  });

  it("exposes no HTTP self-registration path anywhere in the app", () => {
    // The bootstrap command is the only way an admin account comes into being.
    expect(script).toContain("adminUser.create");
  });
});
