import { z } from "zod";

import { normalizeIranianMobile } from "@/lib/phone";
import { normalizePersianText } from "@/lib/persian";
import { normalizeIranianPostalCode } from "@/lib/postal-code";

/** Letters (any script), combining marks, ZWNJ, spaces and a few name punctuation marks. */
const PERSON_NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\u200C\s'’.-]*$/u;

export function personNameSchema(field: string, max = 60) {
  return z
    .string({ required_error: `${field} الزامی است.`, invalid_type_error: `${field} نامعتبر است.` })
    .transform((value) => normalizePersianText(value))
    .refine((value) => value.length > 0, { message: `${field} الزامی است.` })
    .refine((value) => value.length <= max, {
      message: `${field} نباید بیش از ${max} نویسه باشد.`,
    })
    .refine((value) => PERSON_NAME_PATTERN.test(value), {
      message: `${field} فقط می‌تواند شامل حروف باشد.`,
    });
}

export function requiredTextSchema(field: string, max: number, min = 1) {
  return z
    .string({ required_error: `${field} الزامی است.`, invalid_type_error: `${field} نامعتبر است.` })
    .transform((value) => normalizePersianText(value))
    .refine((value) => value.length >= min, {
      message:
        min > 1 ? `${field} باید حداقل ${min} نویسه باشد.` : `${field} الزامی است.`,
    })
    .refine((value) => value.length <= max, {
      message: `${field} نباید بیش از ${max} نویسه باشد.`,
    });
}

/** Accepts 09xxxxxxxxx / +989xxxxxxxxx / Persian digits; stores 09xxxxxxxxx. */
export function iranianMobileSchema(field = "شماره موبایل") {
  return z
    .string({ required_error: `${field} الزامی است.`, invalid_type_error: `${field} نامعتبر است.` })
    .transform((value) => normalizeIranianMobile(value))
    .refine((value): value is string => value !== null, {
      message: `${field} معتبر نیست. نمونه درست: 09121234567`,
    });
}

/** Accepts spaced/dashed and Persian-digit input; stores 10 ASCII digits. */
export function iranianPostalCodeSchema(field = "کد پستی") {
  return z
    .string({ required_error: `${field} الزامی است.`, invalid_type_error: `${field} نامعتبر است.` })
    .transform((value) => normalizeIranianPostalCode(value))
    .refine((value): value is string => value !== null, {
      message: `${field} باید ۱۰ رقم و در قالب استاندارد ایران باشد.`,
    });
}
