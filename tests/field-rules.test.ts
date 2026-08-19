import { describe, expect, it } from "vitest";

import { normalizeIranianMobile } from "@/lib/phone";
import { isIranianPostalCode, normalizeIranianPostalCode } from "@/lib/postal-code";
import { canonicalizeProvince, IRAN_PROVINCES } from "@/modules/address/provinces";

describe("Iranian mobile normalization", () => {
  it.each([
    ["09121234567", "09121234567"],
    ["+989121234567", "09121234567"],
    ["00989121234567", "09121234567"],
    ["9121234567", "09121234567"],
    ["۰۹۱۲۱۲۳۴۵۶۷", "09121234567"],
    ["0912 123 4567", "09121234567"],
    ["0912-123-4567", "09121234567"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeIranianMobile(input)).toBe(expected);
  });

  it.each(["0212345678", "0912123456", "091212345678", "", "abcdefghijk"])(
    "rejects %s",
    (input) => {
      expect(normalizeIranianMobile(input)).toBeNull();
    },
  );
});

describe("Iranian postal code rules (REQ-022)", () => {
  it.each(["1418973511", "۱۴۱۸۹۷۳۵۱۱", "14189-73511", "14189 73511"])(
    "accepts %s",
    (input) => {
      expect(normalizeIranianPostalCode(input)).toBe("1418973511");
    },
  );

  it.each([
    "12345",
    "141897351",
    "14189735110000",
    "0000000000",
    "1111973511",
    "2418973511",
    "1418073511",
    "abcdefghij",
  ])("rejects %s", (input) => {
    expect(isIranianPostalCode(input)).toBe(false);
  });
});

describe("province reference data", () => {
  it("has the 31 provinces of Iran", () => {
    expect(IRAN_PROVINCES).toHaveLength(31);
    expect(new Set(IRAN_PROVINCES).size).toBe(31);
  });

  it.each([
    ["تهران", "تهران"],
    ["كرمان", "کرمان"],
    ["  خراسان   رضوی  ", "خراسان رضوی"],
    ["آذربایجان شرقي", "آذربایجان شرقی"],
  ])("canonicalizes %s", (input, expected) => {
    expect(canonicalizeProvince(input)).toBe(expected);
  });

  it("rejects a place that is not a province", () => {
    expect(canonicalizeProvince("پاریس")).toBeNull();
    expect(canonicalizeProvince("")).toBeNull();
  });
});
