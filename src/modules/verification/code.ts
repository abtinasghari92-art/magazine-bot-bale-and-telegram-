import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

/** Uniformly random numeric code, zero-padded to `length` digits. */
export function generateNumericCode(length: number): string {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += String(randomInt(0, 10));
  }
  return code;
}

/**
 * Codes are never stored in clear text. The stored value is
 * `<salt>:<hmac-sha256(salt, code)>`, so a leaked row cannot be replayed
 * without also brute-forcing per-row.
 */
export function hashVerificationCode(code: string, salt = randomBytes(16).toString("hex")): string {
  const digest = createHmac("sha256", salt).update(code).digest("hex");
  return `${salt}:${digest}`;
}

export function verifyVerificationCode(stored: string, code: string): boolean {
  const separator = stored.indexOf(":");
  if (separator <= 0) return false;
  const salt = stored.slice(0, separator);
  const expected = stored.slice(separator + 1);
  const actual = createHmac("sha256", salt).update(code).digest("hex");
  if (actual.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}
