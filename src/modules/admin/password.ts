import bcrypt from "bcryptjs";

/**
 * Admin password hashing (REQ-046 / REQ-070).
 *
 * bcrypt via the maintained `bcryptjs` package: pure JavaScript, so the Liara
 * `npm ci` build never has to resolve a platform-specific native binary. Cost
 * 12 is the current default for an interactive login.
 */

export const BCRYPT_COST = 12;

/** Minimum policy for the bootstrap command and any future password change. */
export const MIN_PASSWORD_LENGTH = 12;

/**
 * A hash of a value nobody can produce. Verifying against it keeps the timing
 * of "unknown email" indistinguishable from "wrong password".
 */
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEe.9Z0nY2A0mQMcT8O3sJ8cNBd0Hc0kAWK";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_COST);
}

export async function verifyPassword(
  password: string,
  hash: string | null | undefined,
): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(password, DUMMY_HASH);
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

export type PasswordPolicyResult = { ok: true } | { ok: false; message: string };

/** Used by the bootstrap command so a weak first admin password is refused. */
export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      message: `رمز عبور باید حداقل ${MIN_PASSWORD_LENGTH} نویسه باشد.`,
    };
  }
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((pattern) =>
    pattern.test(password),
  ).length;
  if (classes < 3) {
    return {
      ok: false,
      message: "رمز عبور باید حداقل سه دسته از حروف کوچک، بزرگ، رقم و نماد را داشته باشد.",
    };
  }
  return { ok: true };
}
