import { digitsOnly } from "@/lib/persian";

/**
 * Iranian mobile numbers. Input may arrive as 09xxxxxxxxx, +989xxxxxxxxx,
 * 00989xxxxxxxxx or 9xxxxxxxxx, with Persian digits, spaces or dashes.
 * Storage format is always 09xxxxxxxxx.
 */
export function normalizeIranianMobile(input: string): string | null {
  let digits = digitsOnly(input);

  if (digits.startsWith("0098")) {
    digits = digits.slice(4);
  } else if (digits.startsWith("98") && digits.length === 12) {
    digits = digits.slice(2);
  }

  if (digits.length === 10 && digits.startsWith("9")) {
    digits = `0${digits}`;
  }

  return /^09\d{9}$/.test(digits) ? digits : null;
}

export function isIranianMobile(input: string): boolean {
  return normalizeIranianMobile(input) !== null;
}

/** Mask a mobile number for logs and non-owner surfaces: 0912***4567. */
export function maskMobile(input: string): string {
  const normalized = normalizeIranianMobile(input);
  if (!normalized) return "***";
  return `${normalized.slice(0, 4)}***${normalized.slice(7)}`;
}
