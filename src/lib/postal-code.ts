import { digitsOnly } from "@/lib/persian";

/**
 * Iranian postal codes are 10 digits with structural rules published by the
 * national post: the first four digits cannot repeat a single digit, the first
 * five may not contain 0 or 2 in the documented positions.
 *
 * This is the local rule set for REQ-022. If the client later buys an official
 * address/postal service, replace the validator behind `AddressValidator`
 * rather than editing call sites.
 */
export const IRAN_POSTAL_CODE_PATTERN = /^(?!(\d)\1{3})[13-9]{4}[1346-9][013-9]{5}$/;

/** Returns the 10-digit code, or null when the input cannot be a postal code. */
export function normalizeIranianPostalCode(input: string): string | null {
  const digits = digitsOnly(input);
  if (digits.length !== 10) return null;
  return IRAN_POSTAL_CODE_PATTERN.test(digits) ? digits : null;
}

export function isIranianPostalCode(input: string): boolean {
  return normalizeIranianPostalCode(input) !== null;
}
