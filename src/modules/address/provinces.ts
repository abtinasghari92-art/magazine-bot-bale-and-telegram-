import { persianLookupKey } from "@/lib/persian";

/**
 * The 31 provinces of Iran. This is the local reference dataset for REQ-022
 * until the client supplies (or funds) an official province/city service.
 * City lists are intentionally absent: no authoritative dataset is available
 * yet, so cities are validated for shape only.
 */
export const IRAN_PROVINCES = [
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "اردبیل",
  "اصفهان",
  "البرز",
  "ایلام",
  "بوشهر",
  "تهران",
  "چهارمحال و بختیاری",
  "خراسان جنوبی",
  "خراسان رضوی",
  "خراسان شمالی",
  "خوزستان",
  "زنجان",
  "سمنان",
  "سیستان و بلوچستان",
  "فارس",
  "قزوین",
  "قم",
  "کردستان",
  "کرمان",
  "کرمانشاه",
  "کهگیلویه و بویراحمد",
  "گلستان",
  "گیلان",
  "لرستان",
  "مازندران",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
] as const;

export type IranProvince = (typeof IRAN_PROVINCES)[number];

const PROVINCE_BY_KEY = new Map<string, IranProvince>(
  IRAN_PROVINCES.map((province) => [persianLookupKey(province), province]),
);

/** Map free-typed input to the canonical province name, or null if unknown. */
export function canonicalizeProvince(input: string): IranProvince | null {
  return PROVINCE_BY_KEY.get(persianLookupKey(input)) ?? null;
}

export function isKnownProvince(input: string): boolean {
  return canonicalizeProvince(input) !== null;
}
