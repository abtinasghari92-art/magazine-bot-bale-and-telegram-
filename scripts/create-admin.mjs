#!/usr/bin/env node
/**
 * Create (or re-password) the first admin account — REQ-046 / REQ-048.
 *
 *   npm run admin:create
 *
 * There is deliberately no HTTP route that does this: admin accounts exist only
 * because an operator with shell access to the server made one.
 *
 * The password is read from an interactive hidden prompt by default, so it
 * never reaches shell history, a CI log, or a file in the repository. For an
 * automated first deploy, `ADMIN_PASSWORD` is honoured — set it in the host's
 * secret store for a single run, never in git.
 *
 * Plain JavaScript on purpose: this has to run on a production host where only
 * `dependencies` are installed, so it cannot rely on a TypeScript runner.
 */

import { createInterface } from "node:readline";
import process from "node:process";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

/**
 * Mirrors `src/modules/admin/password.ts`. `tests/admin-bootstrap.test.ts`
 * asserts these stay equal to the values the login path uses, so the two copies
 * cannot drift apart unnoticed.
 */
const BCRYPT_COST = 12;
const MIN_PASSWORD_LENGTH = 12;

function readFlag(name) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  if (match) return match.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index !== -1 ? process.argv[index + 1] : undefined;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function fail(message) {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Prompt without echoing the typed characters. */
function promptHidden(question) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(
        new Error(
          "No interactive terminal available. Set ADMIN_PASSWORD for this single run instead.",
        ),
      );
      return;
    }

    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const onData = (char) => {
      // Redraw the prompt without the typed characters.
      if (![`\n`, `\r`, ``].includes(char.toString("utf8"))) {
        process.stdout.write(`[2K[200D${question}`);
      }
    };

    process.stdin.on("data", onData);
    rl.question(question, (answer) => {
      process.stdin.off("data", onData);
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

function checkPasswordPolicy(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  if (classes < 3) {
    return "Password must combine at least three of: lowercase, uppercase, digit, symbol.";
  }
  return null;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function main() {
  const prisma = new PrismaClient();

  try {
    const rawEmail = readFlag("email") ?? process.env.ADMIN_EMAIL;
    if (!rawEmail) {
      fail("Missing admin email. Pass --email you@example.com or set ADMIN_EMAIL.");
    }

    const email = normalizeEmail(rawEmail);
    if (!isEmail(email)) fail(`Not a valid email address: ${email}`);

    const name = readFlag("name") ?? process.env.ADMIN_NAME ?? null;

    let password = process.env.ADMIN_PASSWORD;
    if (password) {
      console.log("Using ADMIN_PASSWORD from the environment.");
    } else {
      password = await promptHidden(`Password for ${email}: `);
      const confirm = await promptHidden("Confirm password: ");
      if (password !== confirm) fail("Passwords did not match.");
    }

    const policyError = checkPasswordPolicy(password);
    if (policyError) fail(policyError);

    const existing = await prisma.adminUser.findUnique({ where: { email } });

    if (existing && !hasFlag("reset-password")) {
      fail(
        `An admin with ${email} already exists. Re-run with --reset-password to set a new password.`,
      );
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);

    if (existing) {
      await prisma.adminUser.update({
        where: { id: existing.id },
        data: { passwordHash, status: "ACTIVE", ...(name ? { name } : {}) },
      });
      // Any session issued against the old password stops working immediately.
      const revoked = await prisma.adminSession.updateMany({
        where: { adminUserId: existing.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      console.log(`\n✔ Password updated for ${email}.`);
      console.log(`  Revoked ${revoked.count} active session(s).\n`);
    } else {
      const created = await prisma.adminUser.create({
        data: { email, name, passwordHash, status: "ACTIVE" },
      });
      console.log(`\n✔ Admin created: ${created.email}`);
      console.log("  Sign in at /admin/login\n");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // Never print the error object wholesale: it can carry the connection string.
  fail(error instanceof Error ? error.message : "Failed to create the admin account.");
});
