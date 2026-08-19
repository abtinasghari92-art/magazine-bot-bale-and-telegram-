/**
 * Persian/Arabic text helpers. Iranian users type digits and letters in several
 * Unicode forms; normalize before validating or storing anything.
 */

const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Convert Persian (۰-۹) and Arabic (٠-٩) digits to ASCII 0-9. */
export function toEnglishDigits(input: string): string {
  let output = "";
  for (const char of input) {
    const persianIndex = PERSIAN_DIGITS.indexOf(char);
    if (persianIndex >= 0) {
      output += String(persianIndex);
      continue;
    }
    const arabicIndex = ARABIC_DIGITS.indexOf(char);
    if (arabicIndex >= 0) {
      output += String(arabicIndex);
      continue;
    }
    output += char;
  }
  return output;
}

/** Keep only ASCII digits (after normalizing Persian/Arabic ones). */
export function digitsOnly(input: string): string {
  return toEnglishDigits(input).replace(/\D/g, "");
}

/**
 * Normalize Persian letters and whitespace so lookups against reference lists
 * (for example the province list) do not fail on Arabic ي/ك or zero-width marks.
 */
export function normalizePersianText(input: string): string {
  return toEnglishDigits(input)
    .replace(/[\u064A\u0649]/g, "\u06CC") // Arabic yeh / alef maksura -> Persian yeh
    .replace(/\u0643/g, "\u06A9") // Arabic kaf -> Persian keheh
    .replace(/[\u200B\u200D-\u200F\u202A-\u202E\uFEFF]/g, "") // zero-width and bidi marks (ZWNJ is kept)
    .replace(/[\u064B-\u0652]/g, "") // harakat
    .replace(/\s+/g, " ")
    .trim();
}

/** Comparison key for reference lookups: normalized text without ZWNJ, lowercased. */
export function persianLookupKey(input: string): string {
  return normalizePersianText(input).replace(/\u200C/g, "").toLowerCase();
}
